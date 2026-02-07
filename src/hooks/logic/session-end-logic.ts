import { getDb } from '../../db/database.js';
import { getProjectById } from '../../db/projects.js';
import { getSessionByClaudeId, endSession } from '../../db/sessions.js';
import { getSessionConversations, completeConversation, stashConversation } from '../../db/conversations.js';
import { getObservationsBySession } from '../../db/observations.js';
import { summarizeConversation } from '../../conversations/summarizer.js';
import { processQueue } from '../../embeddings/queue.js';
import { summarizeObservations } from '../../utils/summarizer.js';
import { getConfig } from '../../shared/config.js';
import { createLogger } from '../../shared/logger.js';
import type { HookInput } from '../../shared/types.js';
import type { ObservationBuffer } from '../../sdk/observation-buffer.js';
import type { curateObservations } from '../../sdk/curation-agent.js';

const log = createLogger('hook:session-end');

export async function handleSessionEnd(
  input: HookInput,
  buffer?: ObservationBuffer,
): Promise<void> {
  if (!input.session_id) return;

  // Initialize database
  getDb();

  const session = getSessionByClaudeId(input.session_id);
  if (!session) return;

  const project = getProjectById(session.project_id);
  if (!project) return;

  // Run curation on buffer if available and enabled
  const config = getConfig();
  if (buffer && config.curation?.enabled) {
    try {
      const { curateObservations: curate } = await import('../../sdk/curation-agent.js');
      const staged = buffer.getStaged();
      if (staged.length >= (config.curation.minObservations ?? 5)) {
        const result = await curate(buffer, project);
        log.info('Curation completed', {
          kept: result.kept,
          discarded: result.discarded,
          merged: result.merged,
          knowledgeExtracted: result.knowledgeExtracted,
        });
      } else {
        // Too few observations — flush everything
        buffer.flush();
      }
    } catch (err) {
      log.warn('Curation failed, flushing buffer', err);
      buffer.flush();
    }
  } else if (buffer) {
    // Curation disabled — flush everything
    buffer.flush();
  }

  // Get all observations for this session
  const observations = getObservationsBySession(session.id);

  // Generate session summary
  const summary = summarizeObservations(observations);

  // Extract key actions and files
  const keyActions: string[] = [];
  const filesModified = new Set<string>();

  for (const obs of observations) {
    if (obs.tool_name === 'Edit' || obs.tool_name === 'Write') {
      for (const f of obs.files_involved) {
        filesModified.add(f);
      }
      if (obs.tool_input_summary) {
        keyActions.push(obs.tool_input_summary);
      }
    }
  }

  // Summarize conversations
  const conversations = getSessionConversations(session.id);
  for (const conv of conversations) {
    try {
      if (conv.status === 'active') {
        await summarizeConversation(conv.id);
        if (conv.observation_count > 0) {
          stashConversation(conv.id);
        } else {
          completeConversation(conv.id);
        }
      }
    } catch (err) {
      log.warn('Failed to summarize conversation', { id: conv.id, error: err });
    }
  }

  // End session
  endSession(
    session.id,
    summary,
    keyActions.slice(0, 20),
    [...filesModified],
  );

  // Process embedding queue (batch flush)
  try {
    const processed = await processQueue();
    if (processed > 0) {
      log.info('Processed embedding queue', { processed });
    }
  } catch (err) {
    log.warn('Embedding queue processing failed', err);
  }

  log.info('Session ended', {
    sessionId: session.id,
    observations: observations.length,
    conversations: conversations.length,
    filesModified: filesModified.size,
  });
}
