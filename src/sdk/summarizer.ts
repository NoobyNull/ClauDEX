import { getObservationsBySession, getObservationsByConversation } from '../db/observations.js';
import { updateConversationSummary } from '../db/conversations.js';
import { createLogger } from '../shared/logger.js';
import { summarizeObservations } from '../utils/summarizer.js';

const log = createLogger('sdk:summarizer');

/**
 * Summarize a session using query()-based approach when available,
 * falling back to extractive summarization.
 */
export async function sdkSummarizeSession(sessionId: string): Promise<string> {
  const observations = getObservationsBySession(sessionId);
  if (observations.length === 0) return 'No observations recorded.';

  // Try SDK query() for LLM summarization
  try {
    const sdk = await tryImportSdk();
    if (sdk) {
      const digest = buildDigest(observations);
      const result = await sdk.query({
        model: 'haiku',
        maxTurns: 1,
        prompt: `Summarize the following developer session observations into 2-4 concise sentences. Focus on what was done, which files were touched, and the outcome. Do not include preamble.\n\n${digest}`,
      });
      if (result?.text) return result.text.trim();
    }
  } catch (err) {
    log.debug('SDK query() summarization unavailable, using extractive', { error: String(err) });
  }

  return summarizeObservations(observations);
}

/**
 * Summarize a conversation using query()-based approach when available.
 */
export async function sdkSummarizeConversation(conversationId: string): Promise<string> {
  const observations = getObservationsByConversation(conversationId);
  if (observations.length === 0) {
    const empty = 'No observations recorded for this conversation.';
    updateConversationSummary(conversationId, empty);
    return empty;
  }

  // Try SDK query() for LLM summarization
  try {
    const sdk = await tryImportSdk();
    if (sdk) {
      const digest = buildDigest(observations);
      const result = await sdk.query({
        model: 'haiku',
        maxTurns: 1,
        prompt: `Summarize the following developer conversation observations into 2-4 concise sentences. Focus on what was done, which files were touched, and the outcome. Do not include preamble.\n\n${digest}`,
      });
      if (result?.text) {
        const summary = result.text.trim();
        updateConversationSummary(conversationId, summary);
        return summary;
      }
    }
  } catch (err) {
    log.debug('SDK query() summarization unavailable, using extractive', { error: String(err) });
  }

  // Fallback to extractive
  const summary = summarizeObservations(observations);
  updateConversationSummary(conversationId, summary);
  return summary;
}

/**
 * Extract knowledge items from a set of observations using query().
 */
export async function sdkExtractKnowledge(
  sessionId: string,
): Promise<Array<{ type: string; content: string; tags: string[] }>> {
  const observations = getObservationsBySession(sessionId);
  if (observations.length < 3) return [];

  try {
    const sdk = await tryImportSdk();
    if (!sdk) return [];

    const digest = buildDigest(observations);
    const result = await sdk.query({
      model: 'haiku',
      maxTurns: 1,
      prompt: `Analyze these developer observations and extract reusable knowledge items. Return a JSON array of objects with {type, content, tags} where type is one of: fact, decision, preference, pattern, issue, context. Only include genuinely useful items. If nothing is worth extracting, return [].

${digest}`,
    });

    if (result?.text) {
      try {
        const jsonMatch = result.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        log.debug('Failed to parse knowledge extraction JSON');
      }
    }
  } catch (err) {
    log.debug('Knowledge extraction unavailable', { error: String(err) });
  }

  return [];
}

interface ObservationLike {
  tool_name: string;
  tool_input_summary: string | null;
  tool_output_summary: string | null;
}

function buildDigest(observations: ObservationLike[]): string {
  const lines: string[] = [];
  for (const obs of observations.slice(0, 40)) {
    const parts: string[] = [obs.tool_name];
    if (obs.tool_input_summary) parts.push(obs.tool_input_summary);
    if (obs.tool_output_summary) parts.push(obs.tool_output_summary.slice(0, 200));
    lines.push(`- ${parts.join(': ')}`);
  }
  return lines.join('\n').slice(0, 3000);
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
