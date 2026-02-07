import type { IncomingMessage, ServerResponse } from 'node:http';
import { hybridSearch } from '../db/search.js';
import { getSession, getRecentSessions } from '../db/sessions.js';
import { getObservationsBySession } from '../db/observations.js';
import { listKnowledge } from '../db/knowledge.js';
import { getStashedConversations, getSessionConversations } from '../db/conversations.js';
import { listProjects } from '../db/projects.js';
import { handleStats } from '../mcp/tools/stats.js';
import { deleteObservation } from '../db/observations.js';
import { deleteKnowledge } from '../db/knowledge.js';
import { getDb } from '../db/database.js';
import { getConfig, saveConfig, getDbPath } from '../shared/config.js';
import { isVectorsAvailable } from '../db/database.js';
import { createLogger } from '../shared/logger.js';
import type { KnowledgeType, StagedObservation } from '../shared/types.js';
import fs from 'node:fs';
import path from 'node:path';

const log = createLogger('web:routes');

// Optional staging buffer reference — set by SDK entry point
let globalStagingBuffer: { getStaged(): StagedObservation[] } | null = null;

export function setStagingBuffer(buffer: { getStaged(): StagedObservation[] }): void {
  globalStagingBuffer = buffer;
}

function sendJson(res: ServerResponse, data: unknown, status: number = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, message: string, status: number = 400): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;
  const method = req.method || 'GET';

  // GET /api/sessions/active — currently running (no ended_at) sessions
  if (method === 'GET' && pathname === '/api/sessions/active') {
    const db = getDb();
    const rows = db.prepare(
      `SELECT s.id, s.claude_session_id, s.project_id, s.started_at, s.observation_count,
              p.name AS project_name, p.root_path AS project_path
       FROM sessions s
       LEFT JOIN projects p ON s.project_id = p.id
       WHERE s.ended_at IS NULL
       ORDER BY s.started_at DESC`
    ).all() as Array<Record<string, unknown>>;
    sendJson(res, { sessions: rows });
    return;
  }

  // GET /api/search?q=...&type=...&project=...&session=...
  if (method === 'GET' && pathname === '/api/search') {
    const query = url.searchParams.get('q') || '';
    if (!query) {
      sendError(res, 'Missing query parameter "q"');
      return;
    }
    const sessionFilter = url.searchParams.get('session') || undefined;
    let results = await hybridSearch(query, {
      query,
      type: (url.searchParams.get('type') as 'all' | 'observations' | 'knowledge' | 'sessions' | 'conversations') || 'all',
      project: url.searchParams.get('project') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '20', 10),
    });
    // Post-filter by session if specified
    if (sessionFilter) {
      results = results.filter((r) => (r as any).session_id === sessionFilter || !(r as any).session_id);
    }
    sendJson(res, { count: results.length, results });
    return;
  }

  // GET /api/sessions?project=...&limit=...
  if (method === 'GET' && pathname === '/api/sessions') {
    const project = url.searchParams.get('project') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    if (project) {
      // Need to find project ID from path
      const db = getDb();
      const projRow = db.prepare('SELECT id FROM projects WHERE root_path = ?').get(project) as { id: string } | undefined;
      if (projRow) {
        const sessions = getRecentSessions(projRow.id, limit);
        sendJson(res, { sessions });
        return;
      }
    }

    // List all sessions
    const db = getDb();
    const rows = db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?').all(limit) as Array<Record<string, unknown>>;
    const sessions = rows.map(row => ({
      id: row['id'],
      claude_session_id: row['claude_session_id'],
      project_id: row['project_id'],
      summary: row['summary'],
      key_actions: JSON.parse((row['key_actions'] as string) || '[]'),
      files_modified: JSON.parse((row['files_modified'] as string) || '[]'),
      started_at: row['started_at'],
      ended_at: row['ended_at'],
      is_resumable: !!(row['is_resumable'] as number),
      observation_count: row['observation_count'],
    }));
    sendJson(res, { sessions });
    return;
  }

  // GET /api/sessions/:id
  const sessionMatch = pathname.match(/^\/api\/sessions\/(.+)$/);
  if (method === 'GET' && sessionMatch) {
    const id = sessionMatch[1];
    const session = getSession(id);
    if (!session) {
      sendError(res, 'Session not found', 404);
      return;
    }
    const observations = getObservationsBySession(id);
    const conversations = getSessionConversations(id);
    sendJson(res, {
      ...session,
      observations: observations.map(o => ({
        id: o.id,
        tool: o.tool_name,
        input_summary: o.tool_input_summary,
        output_summary: o.tool_output_summary,
        files: o.files_involved,
        timestamp: o.timestamp,
        conversation_id: o.conversation_id,
      })),
      conversations,
    });
    return;
  }

  // GET /api/knowledge?type=...&project=...&session=...
  if (method === 'GET' && pathname === '/api/knowledge') {
    const type = url.searchParams.get('type') as KnowledgeType | undefined;
    const project = url.searchParams.get('project') || undefined;
    const sessionFilter = url.searchParams.get('session') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    let items = listKnowledge(project, type || undefined, limit);
    if (sessionFilter) {
      // Knowledge items linked to observations from this session via conversation
      const db = getDb();
      const convIds = db.prepare(
        'SELECT id FROM conversations WHERE session_id = ?'
      ).all(sessionFilter) as Array<{ id: string }>;
      const convIdSet = new Set(convIds.map(c => c.id));
      items = items.filter(k => k.conversation_id && convIdSet.has(k.conversation_id));
    }
    sendJson(res, { items });
    return;
  }

  // GET /api/conversations?project=...
  if (method === 'GET' && pathname === '/api/conversations') {
    const project = url.searchParams.get('project') || undefined;
    const stashed = getStashedConversations(project);
    sendJson(res, { conversations: stashed });
    return;
  }

  // GET /api/projects
  if (method === 'GET' && pathname === '/api/projects') {
    const projects = listProjects();
    sendJson(res, { projects });
    return;
  }

  // GET /api/stats
  if (method === 'GET' && pathname === '/api/stats') {
    const project = url.searchParams.get('project') || undefined;
    const stats = await handleStats({ project });
    sendJson(res, stats);
    return;
  }

  // GET /api/status — full system status dashboard
  if (method === 'GET' && pathname === '/api/status') {
    const config = getConfig();
    const stats = await handleStats({});
    const dbPath = getDbPath();
    const dataDir = config.dataDir;
    const logPath = path.join(dataDir, 'engram.log');

    // Read version from install marker or package.json
    let version = 'unknown';
    const pluginRoot = process.env['ENGRAM_PLUGIN_ROOT'] || '';
    try {
      const marker = JSON.parse(fs.readFileSync(path.join(pluginRoot, '.install-marker'), 'utf-8'));
      version = marker.version;
    } catch {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf-8'));
        version = pkg.version;
      } catch {}
    }

    const vectorsAvailable = isVectorsAvailable();
    const embeddingsActive = stats.embeddings > 0 || stats.pendingEmbeddings > 0;

    sendJson(res, {
      system: {
        version,
        node: process.version,
        platform: process.platform + '/' + process.arch,
        dataDir,
        dbPath,
        dbSize: stats.storageBytes,
        logPath,
        schemaVersion: 4,
      },
      services: {
        mcp: 'running',
        webUI: { enabled: config.webUI.enabled, port: config.webUI.port },
        hooks: ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreToolUse', 'PreCompact', 'SessionEnd'],
      },
      dependencies: {
        'better-sqlite3': true,
        'sqlite-vec': vectorsAvailable,
        fastembed: embeddingsActive || config.embeddings.provider === 'fastembed',
      },
      memory: stats,
      config: {
        autoCapture: config.autoCapture,
        embeddings: {
          enabled: config.embeddings.enabled,
          provider: config.embeddings.provider,
          model: config.embeddings.model,
        },
        vectorSearch: vectorsAvailable,
        conflictDetection: {
          enabled: config.conflictDetection?.enabled ?? false,
          threshold: config.conflictDetection?.similarityThreshold,
        },
        checkpoints: {
          enabled: config.checkpoints?.enabled ?? false,
          autoFork: config.checkpoints?.autoForkBeforeDestructive ?? false,
        },
        knowledgeGraph: config.knowledgeGraph?.enabled ?? false,
        curation: config.curation?.enabled ?? false,
      },
    });
    return;
  }

  // DELETE /api/memories/:id
  const deleteMatch = pathname.match(/^\/api\/memories\/(.+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const id = deleteMatch[1];
    let deleted = false;
    if (id.startsWith('obs_') || id.startsWith('sch_')) {
      deleted = deleteObservation(id);
    } else if (id.startsWith('kn_')) {
      deleted = deleteKnowledge(id);
    }
    sendJson(res, { deleted });
    return;
  }

  // GET /api/config — read current configuration
  if (method === 'GET' && pathname === '/api/config') {
    const config = getConfig();
    sendJson(res, config);
    return;
  }

  // PUT /api/config — update configuration
  if (method === 'PUT' && pathname === '/api/config') {
    try {
      const body = await readBody(req);
      const updates = JSON.parse(body);
      const config = saveConfig(updates);
      sendJson(res, config);
    } catch (err) {
      log.error('Config save failed', err);
      sendError(res, 'Invalid config payload', 400);
    }
    return;
  }

  // DELETE /api/data/observations — purge all observations
  if (method === 'DELETE' && pathname === '/api/data/observations') {
    const db = getDb();
    const info = db.prepare('DELETE FROM observations').run();
    db.prepare("DELETE FROM observations_fts WHERE rowid IN (SELECT rowid FROM observations_fts)").run().changes;
    sendJson(res, { deleted: info.changes });
    return;
  }

  // DELETE /api/data/knowledge — purge all knowledge
  if (method === 'DELETE' && pathname === '/api/data/knowledge') {
    const db = getDb();
    const info = db.prepare('DELETE FROM knowledge').run();
    sendJson(res, { deleted: info.changes });
    return;
  }

  // DELETE /api/data/sessions — purge all sessions + observations + conversations
  if (method === 'DELETE' && pathname === '/api/data/sessions') {
    const db = getDb();
    db.prepare('DELETE FROM observations').run();
    db.prepare('DELETE FROM conversations').run();
    const info = db.prepare('DELETE FROM sessions').run();
    sendJson(res, { deleted: info.changes });
    return;
  }

  // DELETE /api/data/all — nuclear option: purge everything
  if (method === 'DELETE' && pathname === '/api/data/all') {
    const db = getDb();
    const tables = ['observations', 'conversations', 'sessions', 'knowledge', 'embeddings', 'embedding_queue', 'recovery_journal', 'stash_groups', 'projects'];
    let total = 0;
    for (const table of tables) {
      try {
        total += db.prepare(`DELETE FROM ${table}`).run().changes;
      } catch { /* table may not exist */ }
    }
    // Clear vector table
    try { db.prepare('DELETE FROM vec_embeddings').run(); } catch { /* ok */ }
    sendJson(res, { deleted: total });
    return;
  }

  // GET /api/export
  if (method === 'GET' && pathname === '/api/export') {
    const db = getDb();
    const data = {
      exported_at: new Date().toISOString(),
      projects: db.prepare('SELECT * FROM projects').all(),
      sessions: db.prepare('SELECT * FROM sessions').all(),
      conversations: db.prepare('SELECT * FROM conversations').all(),
      observations: db.prepare('SELECT * FROM observations ORDER BY timestamp DESC LIMIT 10000').all(),
      knowledge: db.prepare('SELECT * FROM knowledge').all(),
    };
    sendJson(res, data);
    return;
  }

  // GET /api/knowledge/:id/graph — get knowledge graph for a specific item
  const graphMatch = pathname.match(/^\/api\/knowledge\/(.+)\/graph$/);
  if (method === 'GET' && graphMatch) {
    try {
      const { traverseGraph, countEdges } = await import('../db/knowledge-graph.js');
      const id = graphMatch[1];
      const depth = parseInt(url.searchParams.get('depth') || '5', 10);
      const chain = traverseGraph(id, depth);
      if (!chain) {
        sendError(res, 'Knowledge item not found', 404);
        return;
      }
      sendJson(res, {
        root: { id: chain.root.id, type: chain.root.type, content: chain.root.content },
        nodes: chain.nodes.map(n => ({
          id: n.knowledge.id,
          type: n.knowledge.type,
          content: n.knowledge.content,
          confidence: n.knowledge.confidence,
          depth: n.depth,
          edges: n.edges.map(e => ({
            id: e.id,
            from_id: e.from_id,
            to_id: e.to_id,
            relationship: e.relationship,
            strength: e.strength,
          })),
        })),
        maxDepthReached: chain.maxDepthReached,
        totalEdges: countEdges(id),
      });
    } catch (err) {
      log.error('Graph traversal failed', err);
      sendError(res, 'Graph traversal failed', 500);
    }
    return;
  }

  // GET /api/staging — view the observation staging buffer
  if (method === 'GET' && pathname === '/api/staging') {
    // Import the buffer singleton if available
    try {
      const staged = globalStagingBuffer ? globalStagingBuffer.getStaged() : [];
      sendJson(res, {
        count: staged.length,
        items: staged.map(s => ({
          bufferId: s.bufferId,
          source: s.source,
          stagedAt: new Date(s.stagedAt).toISOString(),
          status: s.status,
          observation: {
            id: s.observation.id,
            tool: s.observation.tool_name,
            input_summary: s.observation.tool_input_summary,
            output_summary: s.observation.tool_output_summary,
            files: s.observation.files_involved,
            tags: s.observation.tags,
            timestamp: new Date(s.observation.timestamp).toISOString(),
          },
        })),
      });
    } catch {
      sendJson(res, { count: 0, items: [] });
    }
    return;
  }

  sendError(res, 'Not found', 404);
}

// Helper: read the full request body as a string
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}
