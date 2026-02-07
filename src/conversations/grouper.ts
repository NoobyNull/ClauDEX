import type { Conversation, TopicShiftAction } from '../shared/types.js';
import {
  getActiveConversation,
  createConversation,
  stashConversation,
} from '../db/conversations.js';
import { getObservationsByConversation } from '../db/observations.js';
import { getThresholds, recordAutoStash, recordSuggestionShown } from '../db/thresholds.js';
import { scoreTopicShift } from './detector.js';
import { createLogger } from '../shared/logger.js';

const log = createLogger('conversations:grouper');

/** How many recent observations to use as context for scoring. */
const CONTEXT_WINDOW = 8;

export interface TopicShiftResult {
  /** What action was taken. */
  action: TopicShiftAction;
  /** The now-active conversation. */
  conversation: Conversation;
  /** If action is 'ask', the suggestion text to inject into Claude's context. */
  suggestion: string | null;
  /** The raw score (for debugging). */
  score: number;
}

/**
 * Evaluate a potential topic shift and take the appropriate action
 * based on the adaptive three-tier system:
 *
 * - **ignore** (score < askThreshold): Same topic. Do nothing.
 * - **ask**    (askThreshold ≤ score < trustThreshold): Inject a suggestion.
 * - **trust**  (score ≥ trustThreshold): Auto-stash and start new conversation.
 */
export async function handleTopicShift(
  sessionId: string,
  projectPath: string,
  projectId: string,
  newActivity: string,
): Promise<TopicShiftResult> {
  let active = getActiveConversation(sessionId);

  // No active conversation yet — create one.
  if (!active) {
    active = createConversation(sessionId, projectPath);
    log.info('No active conversation, created new', { id: active.id });
    return { action: 'ignore', conversation: active, suggestion: null, score: 0 };
  }

  // Get recent observations for context
  const recentObs = getObservationsByConversation(active.id).slice(-CONTEXT_WINDOW);

  // Score the potential shift
  const result = scoreTopicShift({
    recentObservations: recentObs,
    currentTopic: active.topic,
    newActivity,
  });

  // Get adaptive thresholds for this project
  const thresholds = getThresholds(projectId);

  // --- Three-tier decision ---

  if (result.score < thresholds.ask_threshold) {
    // IGNORE — same topic, do nothing
    return { action: 'ignore', conversation: active, suggestion: null, score: result.score };
  }

  if (result.score < thresholds.trust_threshold) {
    // ASK — suggest to the user, but don't auto-stash
    recordSuggestionShown(projectId);

    const topicLabel = result.newTopic || 'a different topic';
    const suggestion = [
      `[Engram] It looks like you may be switching to ${topicLabel}.`,
      `Use mcp__engram__memory_stash to save your current thread ("${active.topic || 'current topic'}") before continuing.`,
      `(Score: ${result.score.toFixed(2)}, threshold: ${thresholds.ask_threshold.toFixed(2)}/${thresholds.trust_threshold.toFixed(2)})`,
    ].join(' ');

    log.info('Topic shift: ASK tier', {
      score: result.score.toFixed(3),
      askThreshold: thresholds.ask_threshold,
      trustThreshold: thresholds.trust_threshold,
      currentTopic: active.topic,
      suggestedTopic: result.newTopic,
    });

    return { action: 'ask', conversation: active, suggestion, score: result.score };
  }

  // TRUST — auto-stash and create new conversation
  recordAutoStash(projectId);

  log.info('Topic shift: TRUST tier — auto-stashing', {
    score: result.score.toFixed(3),
    trustThreshold: thresholds.trust_threshold,
    oldConversation: active.id,
    oldTopic: active.topic,
    newTopic: result.newTopic,
  });

  stashConversation(active.id);
  const newConversation = createConversation(
    sessionId,
    projectPath,
    result.newTopic ?? undefined,
  );

  return { action: 'trust', conversation: newConversation, suggestion: null, score: result.score };
}

/**
 * Get the active conversation for a session, creating one if none exists.
 */
export function ensureConversation(
  sessionId: string,
  projectPath: string,
  topic?: string,
): Conversation {
  const active = getActiveConversation(sessionId);
  if (active) {
    return active;
  }
  const conversation = createConversation(sessionId, projectPath, topic);
  log.info('Ensured conversation (created new)', { id: conversation.id, topic });
  return conversation;
}
