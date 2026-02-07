#!/usr/bin/env node
/**
 * Engram — Standalone stdio MCP server.
 *
 * Wraps all 9 MCP tools for use with the Claude Code plugin system.
 * Launched via .mcp.json:
 *   { "command": "node", "args": ["dist/src/mcp/stdio-server.js"] }
 *
 * Also starts the web UI on the configured port.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, handleToolCall } from './index.js';
import { getDb } from '../db/database.js';
import { runRecovery } from '../recovery/restore.js';
import { getConfig } from '../shared/config.js';
import { createLogger } from '../shared/logger.js';

declare const __ENGRAM_VERSION__: string | undefined;

function resolveVersion(): string {
  // esbuild injects __ENGRAM_VERSION__ at compile time
  if (typeof __ENGRAM_VERSION__ !== 'undefined') return __ENGRAM_VERSION__;
  // Fallback for tsc / development builds — read from package.json
  try {
    const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json');
    return JSON.parse(readFileSync(pkgPath, 'utf-8')).version;
  } catch {
    return '0.0.0-dev';
  }
}

const version = resolveVersion();
const log = createLogger('mcp:stdio');

// Initialize database on startup
try {
  getDb();
} catch (err) {
  log.error('Database initialization failed', err);
  process.exit(1);
}

try {
  runRecovery();
} catch (err) {
  log.error('Recovery failed', err);
}

// Start web UI if enabled
let config;
try {
  config = getConfig();
} catch (err) {
  log.error('Config load failed', err);
  process.exit(1);
}
if (config.webUI.enabled) {
  import('../web/server.js')
    .then(({ startWebServer }) => startWebServer(config.webUI.port))
    .catch(err => log.warn('Failed to start web UI', err));
}

const server = new Server(
  { name: 'engram', version },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info('MCP stdio server running');
}

main().catch((err) => {
  log.error('MCP stdio server failed', err);
  process.exit(1);
});
