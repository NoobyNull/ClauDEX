import { getDb } from '../db/database.js';
import { generateId } from '../db/database.js';
import { createLogger } from '../shared/logger.js';
import { getSessionByClaudeId } from '../db/sessions.js';
import { getObservationsBySession } from '../db/observations.js';
import { getSessionConversations } from '../db/conversations.js';
import type { SessionFork } from '../shared/types.js';

const log = createLogger('sdk:checkpoint');

/**
 * Create a checkpoint (session fork) — a snapshot of the current session state.
 * Used for recovery, branching, and destructive-operation safety.
 *
 * @param claudeSessionId — the Claude CLI session ID to resolve to a Engram session.
 * @param label — optional human-readable label for this checkpoint.
 */
export async function createCheckpoint(claudeSessionId: string, label?: string): Promise<SessionFork | null> {
  const db = getDb();

  const session = getSessionByClaudeId(claudeSessionId);
  if (!session) {
    log.warn('No session found for checkpoint', { claudeSessionId });
    return null;
  }

  const sessionId = session.id;
  const observations = getObservationsBySession(sessionId);
  const conversations = getSessionConversations(sessionId);

  const snapshot = {
    observation_count: observations.length,
    conversation_ids: conversations.map(c => c.id),
    last_observation_id: observations.length > 0 ? observations[observations.length - 1].id : null,
  };

  const id = generateId('fork');
  const now = Date.now();

  db.prepare(`
    INSERT INTO session_forks (id, session_id, label, snapshot, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, sessionId, label || null, JSON.stringify(snapshot), now);

  log.info('Checkpoint created', { id, sessionId, label });

  return {
    id,
    session_id: sessionId,
    label: label || null,
    snapshot,
    created_at: now,
  };
}

/**
 * List all checkpoints, optionally filtered by session.
 */
export function listCheckpoints(sessionId?: string): SessionFork[] {
  const db = getDb();

  let rows: Array<Record<string, unknown>>;
  if (sessionId) {
    rows = db.prepare(
      'SELECT * FROM session_forks WHERE session_id = ? ORDER BY created_at DESC'
    ).all(sessionId) as Array<Record<string, unknown>>;
  } else {
    rows = db.prepare(
      'SELECT * FROM session_forks ORDER BY created_at DESC LIMIT 50'
    ).all() as Array<Record<string, unknown>>;
  }

  return rows.map(parseRow);
}

/**
 * Get a specific checkpoint by ID.
 */
export function getCheckpoint(id: string): SessionFork | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM session_forks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return parseRow(row);
}

function parseRow(row: Record<string, unknown>): SessionFork {
  return {
    id: row['id'] as string,
    session_id: row['session_id'] as string,
    label: row['label'] as string | null,
    snapshot: JSON.parse((row['snapshot'] as string) || '{}'),
    created_at: row['created_at'] as number,
  };
}
