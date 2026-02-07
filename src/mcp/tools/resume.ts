import { getConversation, resumeConversation } from '../../db/conversations.js';
import { getObservationsByConversation } from '../../db/observations.js';
import { getSession } from '../../db/sessions.js';
import { getProjectByPath } from '../../db/projects.js';
import { recordFalsePositive, recordSuggestionAccepted } from '../../db/thresholds.js';
import { buildResumeCommand, buildResumeContext, checkResumability } from '../../claude-sdk/session-manager.js';
import { summarizeObservations } from '../../utils/summarizer.js';
import { createLogger } from '../../shared/logger.js';

const log = createLogger('mcp:resume');

/** If a conversation is resumed within this window of being stashed, it's a false positive. */
const FALSE_POSITIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function handleResume(args: Record<string, unknown>): Promise<unknown> {
  const conversationId = args['conversation_id'] as string;

  // Handle checkpoint-based resume
  if (conversationId.startsWith('fork_')) {
    try {
      const { getCheckpoint } = await import('../../sdk/checkpoint.js');
      const checkpoint = getCheckpoint(conversationId);
      if (checkpoint) {
        return {
          message: `Checkpoint found: ${checkpoint.label || 'unnamed'}`,
          checkpoint_id: checkpoint.id,
          session_id: checkpoint.session_id,
          label: checkpoint.label,
          snapshot: checkpoint.snapshot,
          created_at: new Date(checkpoint.created_at).toISOString(),
          hint: 'This is a session checkpoint, not a stashed conversation.',
        };
      }
    } catch {
      // Checkpoint module not available, fall through
    }
  }

  const conversation = getConversation(conversationId);
  if (!conversation) {
    return { error: `Conversation ${conversationId} not found.` };
  }

  if (conversation.status !== 'stashed') {
    return { error: `Conversation ${conversationId} is not stashed (status: ${conversation.status}).` };
  }

  // --- Adaptive feedback: detect false positives ---
  // If this conversation was auto-stashed very recently, the system got it wrong.
  if (conversation.stashed_at) {
    const timeSinceStash = Date.now() - conversation.stashed_at;
    if (timeSinceStash < FALSE_POSITIVE_WINDOW_MS) {
      const project = getProjectByPath(conversation.project_path);
      if (project) {
        recordFalsePositive(project.id);
        log.info('False positive detected — conversation resumed shortly after auto-stash', {
          conversationId,
          timeSinceStashMs: timeSinceStash,
        });
      }
    }
  }

  // --- Also record this as a suggestion acceptance if applicable ---
  // (User saw a suggestion and manually invoked resume/stash)
  const project = getProjectByPath(conversation.project_path);
  if (project) {
    recordSuggestionAccepted(project.id);
  }

  // Get session info for native resume
  const session = getSession(conversation.session_id);
  let nativeResume: string | null = null;
  let isResumable = false;

  if (session?.claude_session_id) {
    isResumable = await checkResumability(session.claude_session_id);
    if (isResumable) {
      nativeResume = buildResumeCommand(session.claude_session_id);
    }
  }

  // Get conversation observations for context
  const observations = getObservationsByConversation(conversationId);
  const observationSummary = summarizeObservations(observations);

  // Build context for injection
  const context = buildResumeContext(conversation);

  // Resume the conversation
  resumeConversation(conversationId);

  return {
    message: `Resumed conversation: ${conversation.topic || 'untitled'}`,
    conversation_id: conversationId,
    topic: conversation.topic,
    summary: conversation.summary,
    native_resume: nativeResume,
    is_natively_resumable: isResumable,
    context,
    observation_summary: observationSummary,
    observation_count: observations.length,
    hint: isResumable
      ? `For full context, run: ${nativeResume}`
      : 'Native resume not available — context has been injected from Engram memory.',
  };
}
