import { createLogger } from '../shared/logger.js';
import { getConfig } from '../shared/config.js';
import type { Project, CurationResult, StagedObservation } from '../shared/types.js';
import type { ObservationBuffer } from './observation-buffer.js';

const log = createLogger('sdk:curation');

/**
 * Run the curation subagent on buffered observations.
 *
 * Uses Haiku to:
 * - Deduplicate similar observations
 * - Drop noise (trivial reads, redundant searches)
 * - Tag observations with better categories
 * - Extract knowledge items
 * - Merge related observations
 *
 * Budget-capped to prevent cost surprises.
 */
export async function curateObservations(
  buffer: ObservationBuffer,
  project: Project,
): Promise<CurationResult> {
  const config = getConfig();
  const staged = buffer.getStaged();

  if (staged.length === 0) {
    return { kept: 0, discarded: 0, merged: 0, knowledgeExtracted: 0, actions: [] };
  }

  const minObs = config.curation?.minObservations ?? 5;
  if (staged.length < minObs) {
    // Too few to curate — keep all
    buffer.flush();
    return { kept: staged.length, discarded: 0, merged: 0, knowledgeExtracted: 0, actions: [] };
  }

  // Try SDK query() for curation
  try {
    const sdk = await tryImportSdk();
    if (sdk) {
      const result = await runCurationAgent(sdk, staged, project);
      applyCurationResult(buffer, staged, result);
      return result;
    }
  } catch (err) {
    log.warn('Curation agent failed, flushing buffer', err);
  }

  // Fallback: flush everything
  buffer.flush();
  return { kept: staged.length, discarded: 0, merged: 0, knowledgeExtracted: 0, actions: [] };
}

async function runCurationAgent(
  sdk: { query: (opts: Record<string, unknown>) => Promise<{ text: string }> },
  staged: StagedObservation[],
  project: Project,
): Promise<CurationResult> {
  // Build a digest of staged observations
  const lines = staged.map((s, i) => {
    const obs = s.observation;
    return `[${i}] ${obs.tool_name}: ${obs.tool_input_summary || ''} → ${(obs.tool_output_summary || '').slice(0, 100)}`;
  });
  const digest = lines.join('\n').slice(0, 4000);

  const prompt = `You are a memory curation agent for a developer tool. Analyze these ${staged.length} observations from project "${project.name}" and decide which to keep, discard, or merge.

Observations:
${digest}

Rules:
- KEEP observations that record meaningful work: file edits, important bash commands, architecture decisions
- DISCARD trivial reads of common files, redundant search queries, failed commands that were immediately retried
- MERGE related observations (e.g., sequential edits to the same file)
- EXTRACT knowledge: facts, decisions, patterns worth remembering

Return valid JSON:
{
  "keep": [0, 2, 5],
  "discard": [1, 3],
  "merge": [[4, 6]],
  "knowledge": [{"type": "decision", "content": "...", "tags": ["..."]}]
}

Only return the JSON, nothing else.`;

  const result = await sdk.query({
    model: 'haiku',
    maxTurns: 1,
    prompt,
  });

  if (!result?.text) {
    return { kept: staged.length, discarded: 0, merged: 0, knowledgeExtracted: 0, actions: [] };
  }

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]) as {
      keep?: number[];
      discard?: number[];
      merge?: number[][];
      knowledge?: Array<{ type: string; content: string; tags: string[] }>;
    };

    const keepSet = new Set(parsed.keep || []);
    const discardSet = new Set(parsed.discard || []);
    const mergeGroups = parsed.merge || [];
    const knowledge = parsed.knowledge || [];

    // Anything not explicitly kept or discarded → keep
    for (let i = 0; i < staged.length; i++) {
      if (!keepSet.has(i) && !discardSet.has(i)) {
        keepSet.add(i);
      }
    }

    const actions: CurationResult['actions'] = [];
    for (const idx of keepSet) {
      actions.push({ index: idx, action: 'keep' });
    }
    for (const idx of discardSet) {
      actions.push({ index: idx, action: 'discard' });
    }
    for (const group of mergeGroups) {
      actions.push({ index: group[0], action: 'merge', mergeWith: group.slice(1) });
    }

    // Persist knowledge items
    if (knowledge.length > 0) {
      try {
        const { handleSave } = await import('../mcp/tools/save.js');
        for (const k of knowledge) {
          await handleSave({
            content: k.content,
            type: k.type,
            tags: k.tags,
            project: project.root_path,
          });
        }
      } catch (err) {
        log.warn('Failed to persist extracted knowledge', err);
      }
    }

    return {
      kept: keepSet.size,
      discarded: discardSet.size,
      merged: mergeGroups.length,
      knowledgeExtracted: knowledge.length,
      actions,
    };
  } catch (err) {
    log.warn('Failed to parse curation result', err);
    return { kept: staged.length, discarded: 0, merged: 0, knowledgeExtracted: 0, actions: [] };
  }
}

function applyCurationResult(
  buffer: ObservationBuffer,
  staged: StagedObservation[],
  result: CurationResult,
): void {
  const keepIds: number[] = [];
  const discardIds: number[] = [];

  for (const action of result.actions) {
    const item = staged[action.index];
    if (!item) continue;

    if (action.action === 'keep' || action.action === 'merge') {
      keepIds.push(item.bufferId);
    } else if (action.action === 'discard') {
      discardIds.push(item.bufferId);
    }
  }

  if (keepIds.length > 0) buffer.persist(keepIds);
  if (discardIds.length > 0) buffer.discard(discardIds);

  // Flush any remaining pending items
  buffer.flush();
}

async function tryImportSdk(): Promise<{ query: (opts: Record<string, unknown>) => Promise<{ text: string }> } | null> {
  try {
    const moduleName = '@anthropic-ai/claude-code';
    const mod = await import(/* webpackIgnore: true */ moduleName);
    if (mod && typeof mod.query === 'function') {
      return mod as unknown as { query: (opts: Record<string, unknown>) => Promise<{ text: string }> };
    }
  } catch {
    // SDK not available
  }
  return null;
}
