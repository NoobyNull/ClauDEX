#!/usr/bin/env node
/**
 * Engram — Universal hook adapter for the Claude Code plugin system.
 *
 * Bridges between shell-command hooks (stdin JSON → stdout JSON) and
 * the in-process hook logic modules.
 *
 * Usage:
 *   node hook-runner.js <EventName>
 *
 * Reads hook input JSON from stdin, calls the appropriate logic function,
 * writes hook output JSON to stdout.
 *
 * NOTE: Shell-command hooks run in separate processes, so features that
 * depend on shared in-memory state (ObservationBuffer, curation agent,
 * conflict detection) are not available in plugin mode. For the full
 * feature set, use the SDK integration (initEngram).
 */

import { getDb } from '../../db/database.js';
import { getConfig } from '../../shared/config.js';
import { handleSessionStart } from '../logic/session-start-logic.js';
import { handleUserPrompt } from '../logic/user-prompt-logic.js';
import { handlePostToolUse } from '../logic/post-tool-use-logic.js';
import { handlePreCompact } from '../logic/pre-compact-logic.js';
import { handleSessionEnd } from '../logic/session-end-logic.js';
import { buildSystemPromptContext } from '../../sdk/system-prompt.js';
import { createLogger } from '../../shared/logger.js';
import type { HookInput } from '../../shared/types.js';

const log = createLogger('hook:adapter');

// ── Destructive Bash patterns (mirror of sdk/hooks.ts) ─────────────
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

// ── Read stdin ──────────────────────────────────────────────────────
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  process.stdin.setEncoding('utf-8');

  // If stdin is a TTY (no piped data), return immediately
  if (process.stdin.isTTY) return '';

  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk: string | Buffer) => {
      data += typeof chunk === 'string' ? chunk : chunk.toString();
    });
    process.stdin.on('end', () => resolve(data));
    // Timeout after 1s if no data
    setTimeout(() => resolve(data), 1000);
  });
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const event = process.argv[2];
  if (!event) {
    process.stderr.write('Usage: hook-runner.js <EventName>\n');
    process.exit(1);
  }

  // Read input from stdin
  let input: HookInput = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) {
      input = JSON.parse(raw);
    }
  } catch {
    // Empty or invalid stdin — use defaults
  }

  // Initialize database
  getDb();

  let result: Record<string, unknown> = {};

  switch (event) {
    // ── SessionStart ────────────────────────────────────────────────
    case 'SessionStart': {
      try {
        const r = await handleSessionStart(input);
        const context = buildSystemPromptContext(r.project);
        result = { additionalContext: context };
      } catch (err) {
        log.error('SessionStart failed', err);
      }
      break;
    }

    // ── UserPromptSubmit ────────────────────────────────────────────
    case 'UserPromptSubmit': {
      try {
        const r = await handleUserPrompt(input);
        if (r.suggestion) {
          result = { additionalContext: r.suggestion };
        }
      } catch (err) {
        log.error('UserPromptSubmit failed', err);
      }
      break;
    }

    // ── PostToolUse ─────────────────────────────────────────────────
    case 'PostToolUse': {
      try {
        // No buffer available in shell mode — observations go direct to DB
        await handlePostToolUse(input);
      } catch (err) {
        log.error('PostToolUse failed', err);
      }
      break;
    }

    // ── PreToolUse ──────────────────────────────────────────────────
    case 'PreToolUse': {
      const config = getConfig();
      if (input.session_id && config.checkpoints?.enabled && config.checkpoints?.autoForkBeforeDestructive) {
        if (isDestructiveBash(input.tool_input)) {
          try {
            const { createCheckpoint } = await import('../../sdk/checkpoint.js');
            const cmd = String((input.tool_input as Record<string, unknown>)?.['command']).slice(0, 60);
            await createCheckpoint(input.session_id, `auto-fork before: ${cmd}`);
            log.info('Auto-checkpoint before destructive Bash', { command: cmd });
          } catch (err) {
            log.warn('Auto-checkpoint failed', err);
          }
        }
      }
      break;
    }

    // ── PreCompact ──────────────────────────────────────────────────
    case 'PreCompact': {
      try {
        await handlePreCompact(input);
      } catch (err) {
        log.error('PreCompact failed', err);
      }
      break;
    }

    // ── SessionEnd ──────────────────────────────────────────────────
    case 'SessionEnd': {
      try {
        // No buffer in shell mode — session-end still summarizes + flushes embeddings
        await handleSessionEnd(input);
      } catch (err) {
        log.error('SessionEnd failed', err);
      }
      break;
    }

    default:
      process.stderr.write(`Unknown event: ${event}\n`);
      process.exit(1);
  }

  // Write result to stdout
  process.stdout.write(JSON.stringify(result));
}

main().catch(err => {
  log.error('Hook runner failed', err);
  process.exit(1);
});
