import { getDb, closeDb } from '../db/database.js';
import { getConfig } from '../shared/config.js';
import { createLogger } from '../shared/logger.js';
import { createEngramHooks } from './hooks.js';
import { getEngramTools } from './mcp-server.js';
import { ObservationBuffer } from './observation-buffer.js';
import { buildSystemPromptContext } from './system-prompt.js';
import { detectAndRegisterProject } from '../projects/detector.js';
import { runRecovery } from '../recovery/restore.js';
import type { EngramSdkOptions } from '../shared/types.js';

const log = createLogger('sdk:entry');

/**
 * Single entry point for Engram as a Claude Code SDK plugin.
 *
 * Initializes the database, starts the web UI, and returns the combined
 * SDK options: MCP tools, hooks, and system prompt context.
 */
export async function initEngram(cwd: string): Promise<EngramSdkOptions> {
  log.info('Initializing Engram', { cwd });

  // Initialize database
  getDb();

  // Run crash recovery
  runRecovery();

  // Detect project
  const project = detectAndRegisterProject(cwd);

  // Create observation buffer
  const config = getConfig();
  const buffer = new ObservationBuffer({
    checkpointInterval: config.buffer?.checkpointInterval ?? 20,
  });

  // Build system prompt context
  const systemPrompt = buildSystemPromptContext(project);

  // Get MCP tools
  const tools = getEngramTools();

  // Create hooks with buffer
  const hooks = createEngramHooks(buffer);

  // Start web UI if enabled
  if (config.webUI.enabled) {
    try {
      const { setStagingBuffer } = await import('../web/routes.js');
      setStagingBuffer(buffer);
      const { startWebServer } = await import('../web/server.js');
      startWebServer(config.webUI.port);
    } catch (err) {
      log.warn('Failed to start web UI', err);
    }
  }

  // Cleanup handler
  const cleanup = () => {
    buffer.flush();
    closeDb();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  log.info('Engram initialized', {
    project: project.name,
    tools: tools.length,
    hooks: Object.keys(hooks).length,
  });

  return {
    mcpServers: {
      engram: {
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.schema,
          handler: t.handler,
        })),
      },
    },
    hooks: hooks as unknown as Record<string, unknown>,
    systemPrompt,
  };
}
