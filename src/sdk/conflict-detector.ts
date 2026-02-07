import { hybridSearch } from '../db/search.js';
import { getConfig } from '../shared/config.js';
import { createLogger } from '../shared/logger.js';
import type { Observation, SearchResult, ConflictInfo } from '../shared/types.js';

const log = createLogger('sdk:conflict');

/** Similarity thresholds. */
const EXACT_DUPLICATE_THRESHOLD = 0.95;
const CONFLICT_THRESHOLD = 0.65;

/**
 * Check an incoming observation against existing memories for duplicates
 * or near-matches that warrant user clarification.
 *
 * Returns null if no conflict, or a ConflictInfo describing the match.
 */
export async function detectConflict(observation: Observation): Promise<ConflictInfo | null> {
  const config = getConfig();
  if (config.conflictDetection?.enabled === false) return null;

  // Build a search query from the observation content
  const queryParts: string[] = [];
  if (observation.tool_input_summary) queryParts.push(observation.tool_input_summary);
  if (observation.tool_output_summary) queryParts.push(observation.tool_output_summary);
  const query = queryParts.join(' ').slice(0, 300);

  if (query.length < 15) return null; // Too short to meaningfully match

  try {
    const results = await hybridSearch(query, {
      query,
      type: 'all',
      project: observation.project_path,
      limit: 5,
    });

    if (results.length === 0) return null;

    // Filter out the observation itself (it was just inserted)
    const candidates = results.filter(r => r.id !== observation.id);
    if (candidates.length === 0) return null;

    const best = candidates[0];

    // Exact duplicate — skip silently
    if (best.score >= EXACT_DUPLICATE_THRESHOLD) {
      log.debug('Exact duplicate detected, skipping silently', {
        newId: observation.id,
        existingId: best.id,
        score: best.score,
      });
      return {
        newObservationId: observation.id,
        existingMemory: best,
        similarity: best.score,
        level: 'duplicate',
        resolved: true,
        resolution: 'skip',
      };
    }

    // Near-match — needs clarification
    const threshold = config.conflictDetection?.similarityThreshold ?? CONFLICT_THRESHOLD;
    if (best.score >= threshold) {
      log.info('Memory conflict detected', {
        newId: observation.id,
        existingId: best.id,
        score: best.score,
        existingType: best.type,
      });
      return {
        newObservationId: observation.id,
        existingMemory: best,
        similarity: best.score,
        level: 'similar',
        resolved: false,
        resolution: null,
      };
    }

    return null;
  } catch (err) {
    log.debug('Conflict detection search failed', { error: String(err) });
    return null;
  }
}

/**
 * Build the clarification prompt that gets injected into Claude's context.
 * Claude will use this to ask the user via AskUserQuestion.
 */
export function buildConflictPrompt(conflict: ConflictInfo, observation: Observation): string {
  const existing = conflict.existingMemory;
  const similarityPct = Math.round(conflict.similarity * 100);

  const newSummary = [observation.tool_input_summary, observation.tool_output_summary]
    .filter(Boolean)
    .join(' — ')
    .slice(0, 200);

  return [
    `[Engram Memory Conflict] A new observation looks ${similarityPct}% similar to an existing memory.`,
    ``,
    `New: [${observation.tool_name}] ${newSummary}`,
    `Existing (${existing.type}): ${existing.snippet.slice(0, 200)}`,
    ``,
    `Please ask the user how to handle this using AskUserQuestion with these options:`,
    `1. "Same thing" — merge the new observation into the existing memory`,
    `2. "Completely new" — keep both as separate memories`,
    `3. "Replace old" — update the existing memory with this new information`,
    `4. "Don't save" — discard this observation, don't add to memory`,
    ``,
    `Use memory_resolve tool with the conflict_id "${conflict.newObservationId}" and the user's chosen action.`,
  ].join('\n');
}
