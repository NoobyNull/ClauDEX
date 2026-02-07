import { getDb, generateId } from './database.js';
import type { Session } from '../shared/types.js';
import { createLogger } from '../shared/logger.js';

const log = createLogger('db:sessions');

export function createSession(projectId: string, claudeSessionId?: string): Session {
  const db = getDb();
  const now = Date.now();
  const id = generateId('ses');

  db.prepare(`
    INSERT INTO sessions (id, claude_session_id, project_id, summary, key_actions, files_modified, started_at, ended_at, is_resumable, observation_count)
    VALUES (?, ?, ?, NULL, '[]', '[]', ?, NULL, 1, 0)
  `).run(id, claudeSessionId || null, projectId, now);

  log.info('Created session', { id, projectId, claudeSessionId });
  return {
    id, claude_session_id: claudeSessionId || null, project_id: projectId,
    summary: null, key_actions: [], files_modified: [],
    started_at: now, ended_at: null, is_resumable: true, observation_count: 0,
  };
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return deserializeSession(row);
}

export function getSessionByClaudeId(claudeSessionId: string): Session | null {
  const db = getDb();
  // Check both the primary claude_session_id and the prior_claude_session_ids list
  // (resumed sessions get new IDs — known SDK bug)
  const row = db.prepare(`
    SELECT * FROM sessions
    WHERE claude_session_id = ?
       OR (',' || prior_claude_session_ids || ',') LIKE ('%,' || ? || ',%')
    ORDER BY started_at DESC LIMIT 1
  `).get(claudeSessionId, claudeSessionId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return deserializeSession(row);
}

/**
 * Link a new Claude session ID to an existing Engram session.
 *
 * When Claude resumes a session, the resumed session gets a different
 * session_id (known SDK bug). This function updates the primary
 * claude_session_id and archives the old one in prior_claude_session_ids
 * so we can still find the Engram session by any of its Claude IDs.
 */
export function linkClaudeSessionId(engramSessionId: string, newClaudeSessionId: string): void {
  const db = getDb();
  const session = getSession(engramSessionId);
  if (!session) {
    log.warn('Cannot link Claude session ID — Engram session not found', { engramSessionId });
    return;
  }

  // Archive the old ID if present
  const priorRow = db.prepare('SELECT prior_claude_session_ids FROM sessions WHERE id = ?').get(engramSessionId) as { prior_claude_session_ids: string | null } | undefined;
  const priorIds = priorRow?.prior_claude_session_ids ? priorRow.prior_claude_session_ids.split(',') : [];
  if (session.claude_session_id && !priorIds.includes(session.claude_session_id)) {
    priorIds.push(session.claude_session_id);
  }

  db.prepare(`
    UPDATE sessions SET claude_session_id = ?, prior_claude_session_ids = ? WHERE id = ?
  `).run(newClaudeSessionId, priorIds.join(',') || null, engramSessionId);

  log.info('Linked new Claude session ID', { engramSessionId, newClaudeSessionId, priorIds });
}

export function endSession(id: string, summary?: string, keyActions?: string[], filesModified?: string[]): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    UPDATE sessions SET ended_at = ?, summary = COALESCE(?, summary),
    key_actions = COALESCE(?, key_actions), files_modified = COALESCE(?, files_modified)
    WHERE id = ?
  `).run(
    now,
    summary || null,
    keyActions ? JSON.stringify(keyActions) : null,
    filesModified ? JSON.stringify(filesModified) : null,
    id,
  );
  log.info('Ended session', { id });
}

export function updateSessionSummary(id: string, summary: string, keyActions?: string[], filesModified?: string[]): void {
  const db = getDb();
  const parts: string[] = ['summary = ?'];
  const params: unknown[] = [summary];

  if (keyActions) {
    parts.push('key_actions = ?');
    params.push(JSON.stringify(keyActions));
  }
  if (filesModified) {
    parts.push('files_modified = ?');
    params.push(JSON.stringify(filesModified));
  }

  params.push(id);
  db.prepare(`UPDATE sessions SET ${parts.join(', ')} WHERE id = ?`).run(...params);
}

export function incrementSessionObservationCount(id: string): void {
  const db = getDb();
  db.prepare('UPDATE sessions SET observation_count = observation_count + 1 WHERE id = ?').run(id);
}

export function getRecentSessions(projectId: string, limit: number = 10): Session[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM sessions WHERE project_id = ? ORDER BY started_at DESC LIMIT ?'
  ).all(projectId, limit) as Record<string, unknown>[];
  return rows.map(deserializeSession);
}

function deserializeSession(row: Record<string, unknown>): Session {
  return {
    id: row['id'] as string,
    claude_session_id: row['claude_session_id'] as string | null,
    project_id: row['project_id'] as string,
    summary: row['summary'] as string | null,
    key_actions: JSON.parse((row['key_actions'] as string) || '[]'),
    files_modified: JSON.parse((row['files_modified'] as string) || '[]'),
    started_at: row['started_at'] as number,
    ended_at: row['ended_at'] as number | null,
    is_resumable: !!(row['is_resumable'] as number),
    observation_count: row['observation_count'] as number,
  };
}
