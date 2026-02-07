import { handleSessionStart } from '../hooks/logic/session-start-logic.js';
import { handleUserPrompt } from '../hooks/logic/user-prompt-logic.js';
import { handlePostToolUse } from '../hooks/logic/post-tool-use-logic.js';
import { handlePreCompact } from '../hooks/logic/pre-compact-logic.js';
import { handleSessionEnd } from '../hooks/logic/session-end-logic.js';
import { buildSystemPromptContext } from './system-prompt.js';
import { createLogger } from '../shared/logger.js';
import { getConfig } from '../shared/config.js';
import type { HookInput } from '../shared/types.js';
import type { ObservationBuffer } from './observation-buffer.js';

const log = createLogger('sdk:hooks');

/** Destructive Bash patterns that trigger auto-checkpoint. */
const DESTRUCTIVE_PATTERNS = [
  /\brm\s+-rf?\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+push\s+--force\b/,
  /\bgit\s+push\s+-f\b/,
  /\bgit\s+clean\s+-f/,
  /\bgit\s+checkout\s+\.\b/,
  /\bgit\s+restore\s+\.\b/,
  /\bdrop\s+table\b/i,
  /\bdrop\s+database\b/i,
  /\btruncate\b/i,
  /\bformat\b/,
];

function isDestructiveBash(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false;
  const command = (input as Record<string, unknown>)['command'];
  if (typeof command !== 'string') return false;
  return DESTRUCTIVE_PATTERNS.some(p => p.test(command));
}

export interface EngramHookCallbacks {
  SessionStart: Array<{
    matcher: string;
    hooks: Array<{
      type: 'callback';
      callback: (input: HookInput) => Promise<{ additionalContext?: string }>;
    }>;
  }>;
  UserPromptSubmit: Array<{
    hooks: Array<{
      type: 'callback';
      callback: (input: HookInput) => Promise<{ additionalContext?: string }>;
    }>;
  }>;
  PostToolUse: Array<{
    matcher: string;
    hooks: Array<{
      type: 'callback';
      callback: (input: HookInput) => Promise<{ async: boolean }>;
    }>;
  }>;
  PreToolUse: Array<{
    matcher: string;
    hooks: Array<{
      type: 'callback';
      callback: (input: HookInput) => Promise<Record<string, unknown>>;
    }>;
  }>;
  PreCompact: Array<{
    hooks: Array<{
      type: 'callback';
      callback: (input: HookInput) => Promise<Record<string, unknown>>;
    }>;
  }>;
  SessionEnd: Array<{
    hooks: Array<{
      type: 'callback';
      callback: (input: HookInput) => Promise<Record<string, unknown>>;
    }>;
  }>;
}

/**
 * Create SDK hook callback mappings for all Engram lifecycle events.
 * Returns an object suitable for the `hooks` SDK option.
 */
export function createEngramHooks(buffer?: ObservationBuffer): EngramHookCallbacks {
  return {
    SessionStart: [{
      matcher: 'startup|resume',
      hooks: [{
        type: 'callback',
        callback: async (input: HookInput) => {
          try {
            const result = await handleSessionStart(input);
            const context = buildSystemPromptContext(result.project);
            return { additionalContext: context };
          } catch (err) {
            log.error('SessionStart hook failed', err);
            return {};
          }
        },
      }],
    }],

    UserPromptSubmit: [{
      hooks: [{
        type: 'callback',
        callback: async (input: HookInput) => {
          const contextParts: string[] = [];

          // Check for unresolved memory conflicts first
          if (buffer && buffer.conflictCount > 0) {
            try {
              const { buildConflictPrompt } = await import('./conflict-detector.js');
              const conflicts = buffer.getPendingConflicts();
              // Surface one conflict at a time to avoid overwhelming the user
              const next = conflicts[0];
              if (next?.conflict) {
                const prompt = buildConflictPrompt(next.conflict, next.observation);
                contextParts.push(prompt);
              }
            } catch (err) {
              log.debug('Conflict prompt injection failed', err);
            }
          }

          // Run topic shift detection
          try {
            const result = await handleUserPrompt(input);
            if (result.suggestion) {
              contextParts.push(result.suggestion);
            }
          } catch (err) {
            log.error('UserPromptSubmit hook failed', err);
          }

          if (contextParts.length > 0) {
            return { additionalContext: contextParts.join('\n\n') };
          }
          return {};
        },
      }],
    }],

    PostToolUse: [{
      matcher: 'Read|Edit|Write|Bash|Grep|Glob|WebFetch|WebSearch',
      hooks: [{
        type: 'callback',
        callback: async (input: HookInput) => {
          try {
            await handlePostToolUse(input, buffer);
          } catch (err) {
            log.error('PostToolUse hook failed', err);
          }
          // Non-blocking — return immediately
          return { async: true };
        },
      }],
    }],

    PreToolUse: [{
      matcher: 'Bash',
      hooks: [{
        type: 'callback',
        callback: async (input: HookInput) => {
          const config = getConfig();
          if (input.session_id && config.checkpoints?.enabled && config.checkpoints?.autoForkBeforeDestructive) {
            if (isDestructiveBash(input.tool_input)) {
              try {
                const { createCheckpoint } = await import('./checkpoint.js');
                await createCheckpoint(input.session_id, `auto-fork before: ${String((input.tool_input as Record<string, unknown>)?.['command']).slice(0, 60)}`);
                log.info('Auto-checkpoint before destructive Bash', { command: (input.tool_input as Record<string, unknown>)?.['command'] });
              } catch (err) {
                log.warn('Auto-checkpoint failed', err);
              }
            }
          }
          return {};
        },
      }],
    }],

    PreCompact: [{
      hooks: [{
        type: 'callback',
        callback: async (input: HookInput) => {
          try {
            await handlePreCompact(input);
          } catch (err) {
            log.error('PreCompact hook failed', err);
          }
          return {};
        },
      }],
    }],

    SessionEnd: [{
      hooks: [{
        type: 'callback',
        callback: async (input: HookInput) => {
          try {
            await handleSessionEnd(input, buffer);
          } catch (err) {
            log.error('SessionEnd hook failed', err);
          }
          return {};
        },
      }],
    }],
  };
}
