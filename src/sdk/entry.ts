import { getDb, closeDb } from '../db/database.js';
import { getConfig } from '../shared/config.js';
import { createLogger } from '../shared/logger.js';
import { createEngramHooks } from './hooks.js';
import { getEngramTools } from './mcp-server.js';
import { ObservationBuffer } from './observation-buffer.js';
import { buildSystemPromptContext } from './system-prompt.js';
import { detectAndRegisterProject } from '../projects/detector.js';
import { runRecovery } from '../recovery/restore.js';
import { startProcessWatcher, stopProcessWatcher } from '../utils/process-watcher.js';
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
  log.debug('Starting Engram initialization sequence');

  // Initialize database
  log.debug('Initializing database...');
  getDb();
  log.debug('Database initialized successfully');

  // Run crash recovery
  log.debug('Running crash recovery checks...');
  runRecovery();
  log.debug('Crash recovery complete');

  // Detect project
  log.debug('Detecting project', { cwd });
  const project = detectAndRegisterProject(cwd);
  log.debug('Project detected', { name: project.name, path: project.root_path });

  // Create observation buffer
  log.debug('Loading configuration...');
  const config = getConfig();
  log.debug('Configuration loaded', { checkpointInterval: config.buffer?.checkpointInterval ?? 20 });

  log.debug('Creating observation buffer...');
  const buffer = new ObservationBuffer({
    checkpointInterval: config.buffer?.checkpointInterval ?? 20,
  });
  log.debug('Observation buffer created');

  // Build system prompt context
  log.debug('Building system prompt context...');
  const systemPrompt = buildSystemPromptContext(project);
  log.debug('System prompt context built', { length: systemPrompt.length });

  // Get MCP tools
  log.debug('Registering MCP tools...');
  const tools = getEngramTools();
  log.debug('MCP tools registered', { count: tools.length });

  // Create hooks with buffer
  log.debug('Creating hooks...');
  const hooks = createEngramHooks(buffer);
  log.debug('Hooks created', { count: Object.keys(hooks).length });

  // Start web UI if enabled
  if (config.webUI.enabled) {
    log.debug('Web UI is enabled, starting server...', { port: config.webUI.port });
    try {
      const { setStagingBuffer } = await import('../web/routes.js');
      setStagingBuffer(buffer);
      const { startWebServer } = await import('../web/server.js');
      startWebServer(config.webUI.port);
      log.debug('Web UI server started successfully', { port: config.webUI.port });
    } catch (err) {
      log.warn('Failed to start web UI', err);
    }
  } else {
    log.debug('Web UI is disabled');
  }

  // Start process watcher to monitor Claude Code
  log.debug('Starting process watcher...');
  startProcessWatcher(() => {
    log.info('Process watcher triggered shutdown');
    buffer.flush();
    closeDb();
  });
  log.debug('Process watcher started');

  // Cleanup handler
  const cleanup = () => {
    stopProcessWatcher();
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
