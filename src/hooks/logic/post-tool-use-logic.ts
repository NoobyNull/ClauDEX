import { getDb } from '../../db/database.js';
import { getProjectById, incrementProjectObservationCount } from '../../db/projects.js';
import { getSessionByClaudeId, incrementSessionObservationCount } from '../../db/sessions.js';
import { getActiveConversation, incrementConversationObservationCount } from '../../db/conversations.js';
import { journaledInsertObservation } from '../../recovery/journal.js';
import { enqueueEmbedding } from '../../embeddings/queue.js';
import { isPrivacyExcluded } from '../../shared/config.js';
import { summarizeToolInput, summarizeToolOutput, extractFilePaths } from '../../utils/summarizer.js';
import { createLogger } from '../../shared/logger.js';
import type { HookInput, Observation } from '../../shared/types.js';
import type { ObservationBuffer } from '../../sdk/observation-buffer.js';

const log = createLogger('hook:post-tool-use');

export async function handlePostToolUse(
  input: HookInput,
  buffer?: ObservationBuffer,
): Promise<Observation | null> {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input;
  const toolResponse = input.tool_response || '';

  if (!toolName || !input.session_id) return null;

  // Initialize database
  getDb();

  const session = getSessionByClaudeId(input.session_id);
  if (!session) return null;

  const project = getProjectById(session.project_id);
  if (!project) return null;

  const conversation = getActiveConversation(session.id);

  // Summarize input and output
  const inputSummary = summarizeToolInput(toolName, toolInput);
  const outputSummary = summarizeToolOutput(toolName, toolResponse);

  // Extract file paths
  const inputStr = typeof toolInput === 'string' ? toolInput : JSON.stringify(toolInput || '');
  const allFiles = [
    ...extractFilePaths(inputStr),
    ...extractFilePaths(toolResponse),
  ];

  // Check privacy exclusion
  const filteredFiles = allFiles.filter(f => !isPrivacyExcluded(f));
  if (allFiles.length > 0 && filteredFiles.length === 0) {
    log.debug('All files excluded by privacy filter', { toolName });
    return null;
  }

  if (isPrivacyExcluded(inputSummary) || isPrivacyExcluded(outputSummary)) {
    log.debug('Content excluded by privacy filter', { toolName });
    return null;
  }

  // Auto-tag based on tool name
  const tags: string[] = [];
  if (toolName === 'Edit' || toolName === 'Write') tags.push('modification');
  if (toolName === 'Read') tags.push('read');
  if (toolName === 'Bash') tags.push('command');
  if (toolName === 'Grep' || toolName === 'Glob') tags.push('search');
  if (toolName === 'WebFetch' || toolName === 'WebSearch') tags.push('web');

  try {
    const obs = journaledInsertObservation({
      session_id: session.id,
      conversation_id: conversation?.id,
      tool_name: toolName,
      tool_input_summary: inputSummary,
      tool_output_summary: outputSummary,
      project_path: project.root_path,
      files_involved: filteredFiles,
      tags,
    });

    // Update counts
    incrementSessionObservationCount(session.id);
    incrementProjectObservationCount(project.id);
    if (conversation) {
      incrementConversationObservationCount(conversation.id);
    }

    // Queue for embedding
    const embeddingText = [inputSummary, outputSummary].filter(Boolean).join(' | ');
    if (embeddingText.length > 10) {
      enqueueEmbedding('observation', obs.id, embeddingText);
    }

    // Stage in buffer if available, then run conflict detection async
    if (buffer) {
      const staged = buffer.add({
        observation: obs,
        source: 'auto',
      });

      // Fire-and-forget conflict detection — results surface via UserPromptSubmit
      import('../../sdk/conflict-detector.js')
        .then(({ detectConflict }) => detectConflict(obs))
        .then(conflict => {
          if (conflict && conflict.level === 'similar' && !conflict.resolved) {
            buffer.flagConflict(staged.bufferId, conflict);
          }
        })
        .catch(err => log.debug('Conflict detection failed', { error: String(err) }));
    }

    log.debug('Observation recorded', { id: obs.id, tool: toolName });
    return obs;
  } catch (err) {
    log.error('Failed to record observation', err);
    return null;
  }
}
