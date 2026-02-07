import { getConfig } from '../shared/config.js';
import { createLogger } from '../shared/logger.js';
import type { Knowledge, KnowledgeEdge } from '../shared/types.js';
import { createKnowledge, getKnowledge } from '../db/knowledge.js';
import { createEdge, getEdgesFrom, findConnected } from '../db/knowledge-graph.js';
import { hybridSearch } from '../db/search.js';
import { enqueueEmbedding } from '../embeddings/queue.js';

const log = createLogger('sdk:discovery');

/**
 * When new knowledge is saved, search for related existing knowledge that
 * could combine to form a discovery. If the SDK query() function is available,
 * uses a Haiku subagent to reason about combinations. Otherwise, creates
 * structural edges based on search similarity.
 */
export async function onKnowledgeCreated(knowledge: Knowledge): Promise<KnowledgeEdge[]> {
  const config = getConfig();
  if (!config.knowledgeGraph?.enabled) return [];

  const edges: KnowledgeEdge[] = [];

  try {
    // 1. Link to source knowledge items referenced in source_knowledge_ids
    for (const srcId of knowledge.source_knowledge_ids) {
      const srcKn = getKnowledge(srcId);
      if (srcKn) {
        const edge = createEdge({
          from_id: knowledge.id,
          to_id: srcId,
          relationship: 'derives_from',
          strength: 1.0,
        });
        edges.push(edge);
      }
    }

    // 2. Link to source observations via 'derives_from'
    // (source_observation_ids are already on the knowledge record)

    // 3. Search for related knowledge and create weaker 'supports' edges
    const related = await hybridSearch(knowledge.content, {
      query: knowledge.content,
      type: 'knowledge',
      project: knowledge.project_path || undefined,
      limit: 5,
    });

    for (const result of related) {
      if (result.id === knowledge.id) continue;
      if (result.score < 0.5) continue;

      // Don't duplicate edges we already created above
      if (knowledge.source_knowledge_ids.includes(result.id)) continue;

      const relationship = inferRelationship(knowledge, result);
      const edge = createEdge({
        from_id: knowledge.id,
        to_id: result.id,
        relationship,
        strength: result.score,
      });
      edges.push(edge);
    }

    // 4. If discovery engine is enabled and query() is available, try to
    //    derive new discoveries from combinations of connected knowledge
    if (config.knowledgeGraph.discoveryEnabled) {
      await tryDiscoverFromCombinations(knowledge);
    }
  } catch (err) {
    log.warn('Discovery engine failed', { error: String(err) });
  }

  return edges;
}

/**
 * Attempt to discover new knowledge by combining the newly created knowledge
 * item with its connected neighbors. Uses the Claude SDK query() if available.
 */
async function tryDiscoverFromCombinations(knowledge: Knowledge): Promise<void> {
  // Only trigger for facts, patterns, and issues — these are most combinable
  if (!['fact', 'pattern', 'issue', 'discovery'].includes(knowledge.type)) return;

  const connected = findConnected(knowledge.id);
  if (connected.length < 1) return;

  // Limit to avoid exponential blowup — only consider top 5 most related
  const candidates = connected.slice(0, 5);

  try {
    // Try to use SDK query() for reasoning
    const sdk = await tryImportSdk();
    if (!sdk) return;

    const prompt = buildDiscoveryPrompt(knowledge, candidates);
    const result = await sdk.query({
      prompt,
      model: 'haiku',
      maxTurns: 1,
      systemPrompt: 'You are a knowledge synthesis agent. Analyze the provided knowledge items and determine if any new discovery can be derived by combining them. Respond ONLY with valid JSON.',
    });

    // Parse discovery from response
    const text = typeof result === 'string' ? result : (result as { text?: string }).text || JSON.stringify(result);
    const discoveries = parseDiscoveries(text);

    for (const disc of discoveries) {
      const sourceIds = [knowledge.id, ...disc.sourceIds.filter(id => candidates.some(c => c.id === id))];

      const newKn = createKnowledge({
        type: 'discovery',
        content: disc.content,
        source_observation_ids: knowledge.source_observation_ids,
        project_path: knowledge.project_path || undefined,
        tags: [...(knowledge.tags || []), 'auto-discovered'],
        confidence: disc.confidence,
        source_knowledge_ids: sourceIds,
      });

      // Create edges from discovery to its sources
      for (const srcId of sourceIds) {
        createEdge({
          from_id: newKn.id,
          to_id: srcId,
          relationship: 'derives_from',
          strength: disc.confidence,
        });
      }

      // Queue for embedding
      enqueueEmbedding('knowledge', newKn.id, disc.content);

      log.info('Auto-discovered knowledge', { id: newKn.id, content: disc.content.slice(0, 80) });
    }
  } catch {
    // SDK not available or query failed — skip automatic discovery
    log.debug('Automatic discovery skipped (SDK query not available)');
  }
}

function buildDiscoveryPrompt(knowledge: Knowledge, candidates: Knowledge[]): string {
  const items = [knowledge, ...candidates].map((k, i) => (
    `[${i + 1}] (${k.type}, id: ${k.id}) ${k.content}`
  )).join('\n');

  return `Given these knowledge items:\n\n${items}\n\n` +
    `Can any NEW insight, conclusion, or discovery be derived by combining two or more of these items? ` +
    `Only output discoveries that logically follow from combining the given items — do not speculate beyond what the data supports.\n\n` +
    `Respond with JSON: { "discoveries": [{ "content": "...", "sourceIds": ["id1", "id2"], "confidence": 0.0-1.0 }] }\n` +
    `If no discovery is possible, respond with: { "discoveries": [] }`;
}

interface ParsedDiscovery {
  content: string;
  sourceIds: string[];
  confidence: number;
}

function parseDiscoveries(text: string): ParsedDiscovery[] {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*"discoveries"[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as { discoveries?: ParsedDiscovery[] };
    if (!Array.isArray(parsed.discoveries)) return [];

    return parsed.discoveries.filter(d =>
      typeof d.content === 'string' &&
      d.content.length > 0 &&
      Array.isArray(d.sourceIds) &&
      typeof d.confidence === 'number' &&
      d.confidence > 0.3
    );
  } catch {
    return [];
  }
}

/**
 * Infer the relationship between new knowledge and an existing search result.
 */
function inferRelationship(
  newKn: Knowledge,
  existing: { id: string; type: string; score: number },
): 'supports' | 'refines' | 'leads_to' {
  // High similarity + same type → likely refines
  if (existing.score > 0.8 && existing.type === newKn.type) {
    return 'refines';
  }

  // Discovery type tends to "lead to" things
  if (newKn.type === 'discovery' || newKn.type === 'pattern') {
    return 'leads_to';
  }

  // Default
  return 'supports';
}

async function tryImportSdk(): Promise<{ query: (opts: Record<string, unknown>) => Promise<{ text: string }> } | null> {
  try {
    const moduleName = '@anthropic-ai/claude-code';
    const mod = await import(/* webpackIgnore: true */ moduleName);
    if (mod && typeof mod.query === 'function') {
      return mod as unknown as { query: (opts: Record<string, unknown>) => Promise<{ text: string }> };
    }
  } catch { /* not available */ }
  return null;
}
