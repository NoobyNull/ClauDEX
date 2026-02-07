import { getDb } from '../../db/database.js';
import { getSessionByClaudeId } from '../../db/sessions.js';
import { getProjectById } from '../../db/projects.js';
import { handleTopicShift } from '../../conversations/grouper.js';
import { createLogger } from '../../shared/logger.js';
import type { HookInput } from '../../shared/types.js';

const log = createLogger('hook:user-prompt');

export interface UserPromptResult {
  suggestion: string | null;
  action: 'ignore' | 'ask' | 'trust';
}

export async function handleUserPrompt(input: HookInput): Promise<UserPromptResult> {
  const prompt = input.prompt || '';

  if (!prompt || !input.session_id) return { suggestion: null, action: 'ignore' };

  // Initialize database
  getDb();

  const session = getSessionByClaudeId(input.session_id);
  if (!session) return { suggestion: null, action: 'ignore' };

  const project = getProjectById(session.project_id);
  if (!project) return { suggestion: null, action: 'ignore' };

  try {
    const result = await handleTopicShift(session.id, project.root_path, project.id, prompt);

    switch (result.action) {
      case 'ignore':
        return { suggestion: null, action: 'ignore' };

      case 'ask':
        log.info('Topic shift suggestion shown', {
          sessionId: session.id,
          score: result.score.toFixed(3),
          currentTopic: result.conversation.topic,
        });
        return { suggestion: result.suggestion || null, action: 'ask' };

      case 'trust':
        log.info('Topic auto-stashed', {
          sessionId: session.id,
          score: result.score.toFixed(3),
          newTopic: result.conversation.topic,
        });
        return { suggestion: null, action: 'trust' };
    }
  } catch (err) {
    log.warn('Topic shift detection failed', err);
    return { suggestion: null, action: 'ignore' };
  }
}
