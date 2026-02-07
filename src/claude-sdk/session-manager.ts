/**
 * Session management helpers — resume and resumability checks.
 *
 * All functions are safe to call even when the Claude Code SDK is not
 * installed; they degrade gracefully and log relevant warnings.
 *
 * NOTE on session renaming: The Claude Code SDK does not currently support
 * programmatic session renaming. Session names are determined by the first
 * user prompt and cannot be changed after creation. Engram tracks topic
 * labels internally in its own database instead.
 *
 * NOTE on session ID stability: When a session is resumed via the SDK, the
 * resumed session receives a *different* session_id from the original (known
 * bug). Engram handles this by storing all known Claude session IDs for a
 * given Engram session (see linkClaudeSessionId in sessions.ts) and checking
 * resumability against the most recent one.
 */

import { claudeClient } from './client.js';
import { createLogger } from '../shared/logger.js';
import type { Conversation } from '../shared/types.js';

const log = createLogger('claude-sdk:session-manager');

// ---------------------------------------------------------------------------
// Resumability check
// ---------------------------------------------------------------------------

/**
 * Check whether a previously-stored Claude session ID is still valid and
 * resumable via the CLI.
 *
 * Returns `false` when the SDK is not available or the session cannot be
 * verified.
 */
export async function checkResumability(claudeSessionId: string): Promise<boolean> {
  log.debug(`Checking resumability for session ${claudeSessionId}`);

  const info = await claudeClient.getSessionInfo(claudeSessionId);
  if (!info) {
    log.debug(`Session ${claudeSessionId} not found or SDK unavailable — not resumable`);
    return false;
  }

  log.debug(`Session ${claudeSessionId} resumable=${info.resumable}`);
  return info.resumable;
}

// ---------------------------------------------------------------------------
// Resume command builder
// ---------------------------------------------------------------------------

/**
 * Build a CLI command string that will resume a given Claude session.
 *
 * Example output: `claude --resume abc-123`
 */
export function buildResumeCommand(claudeSessionId: string): string {
  return `claude --resume ${claudeSessionId}`;
}

// ---------------------------------------------------------------------------
// Context injection builder
// ---------------------------------------------------------------------------

/**
 * Build a context-injection string from a `Conversation` record.
 *
 * This is useful when native `--resume` is unavailable (e.g. session has
 * expired) and the caller wants to seed a new session with relevant context
 * about the prior conversation.
 */
export function buildResumeContext(conversation: Conversation): string {
  const parts: string[] = [];

  parts.push('=== Previous Conversation Context ===');
  parts.push(`Session ID: ${conversation.session_id}`);

  if (conversation.topic) {
    parts.push(`Topic: ${conversation.topic}`);
  }

  if (conversation.summary) {
    parts.push(`Summary: ${conversation.summary}`);
  }

  parts.push(`Status: ${conversation.status}`);
  parts.push(`Project path: ${conversation.project_path}`);

  if (conversation.started_at) {
    parts.push(`Started: ${new Date(conversation.started_at).toISOString()}`);
  }

  if (conversation.ended_at) {
    parts.push(`Ended: ${new Date(conversation.ended_at).toISOString()}`);
  }

  if (conversation.observation_count > 0) {
    parts.push(`Observations captured: ${conversation.observation_count}`);
  }

  parts.push('=== End Previous Context ===');

  return parts.join('\n');
}
