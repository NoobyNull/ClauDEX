#!/usr/bin/env node
/**
 * Engram Plugin Builder
 *
 * Bundles the plugin into a self-contained directory using esbuild.
 * Native dependencies (better-sqlite3, sqlite-vec, fastembed) stay external
 * and are installed at runtime via the SessionStart hook.
 *
 * Usage: node scripts/build-plugin.js
 * Output: plugin/
 */

import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'plugin');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

// ── Clean output ─────────────────────────────────────────────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'scripts'), { recursive: true });

// ── Shared esbuild config ────────────────────────────────────────
const EXTERNAL = [
  'better-sqlite3',
  'sqlite-vec',
  'fastembed',
  '@anthropic-ai/claude-code',
];

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: EXTERNAL,
  define: {
    '__ENGRAM_VERSION__': JSON.stringify(pkg.version),
  },
  logOverride: {
    'empty-import-meta': 'silent', // import.meta.url is ESM-only fallback, dead code in CJS
  },
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

// ── Bundle #1: hook-runner ───────────────────────────────────────
console.log('\n▸ Bundling hook-runner...');
await esbuild.build({
  ...shared,
  entryPoints: [path.join(ROOT, 'src/hooks/adapters/hook-runner.ts')],
  outfile: path.join(OUT, 'scripts/hook-runner.cjs'),
});

// ── Bundle #2: mcp-server ────────────────────────────────────────
console.log('\n▸ Bundling mcp-server...');
await esbuild.build({
  ...shared,
  entryPoints: [path.join(ROOT, 'src/mcp/stdio-server.ts')],
  outfile: path.join(OUT, 'scripts/mcp-server.cjs'),
});

// ── Copy static web assets ───────────────────────────────────────
console.log('\n▸ Copying web assets...');
const publicSrc = path.join(ROOT, 'src/web/public');
const publicDst = path.join(OUT, 'web/public');
fs.cpSync(publicSrc, publicDst, { recursive: true });

// ── Copy skills ──────────────────────────────────────────────────
console.log('▸ Copying skills...');
const skillsSrc = path.join(ROOT, 'skills');
const skillsDst = path.join(OUT, 'skills');
if (fs.existsSync(skillsSrc)) {
  fs.cpSync(skillsSrc, skillsDst, { recursive: true });
}

// ── Generate hooks.json ──────────────────────────────────────────
console.log('▸ Generating hooks.json...');
fs.mkdirSync(path.join(OUT, 'hooks'), { recursive: true });

function hookCmd(event) {
  return `node "\${CLAUDE_PLUGIN_ROOT}/scripts/hook-runner.cjs" ${event}`;
}

function setupCmd() {
  return `node "\${CLAUDE_PLUGIN_ROOT}/scripts/setup.js"`;
}

const hooksJson = {
  hooks: {
    SessionStart: [{
      matcher: 'startup|resume',
      hooks: [
        { type: 'command', command: setupCmd(), timeout: 120 },
        { type: 'command', command: hookCmd('SessionStart') },
      ],
    }],
    UserPromptSubmit: [{
      hooks: [{ type: 'command', command: hookCmd('UserPromptSubmit') }],
    }],
    PostToolUse: [{
      matcher: 'Read|Edit|Write|Bash|Grep|Glob|WebFetch|WebSearch',
      hooks: [{ type: 'command', command: hookCmd('PostToolUse') }],
    }],
    PreToolUse: [{
      matcher: 'Bash',
      hooks: [{ type: 'command', command: hookCmd('PreToolUse') }],
    }],
    PreCompact: [{
      hooks: [{ type: 'command', command: hookCmd('PreCompact') }],
    }],
    SessionEnd: [{
      hooks: [{ type: 'command', command: hookCmd('SessionEnd') }],
    }],
  },
};

fs.writeFileSync(
  path.join(OUT, 'hooks/hooks.json'),
  JSON.stringify(hooksJson, null, 2) + '\n',
);

// ── Generate .mcp.json ───────────────────────────────────────────
console.log('▸ Generating .mcp.json...');
const mcpJson = {
  mcpServers: {
    engram: {
      command: 'node',
      args: ['${CLAUDE_PLUGIN_ROOT}/scripts/mcp-server.cjs'],
      env: {
        ENGRAM_PLUGIN_ROOT: '${CLAUDE_PLUGIN_ROOT}',
      },
    },
  },
};

fs.writeFileSync(
  path.join(OUT, '.mcp.json'),
  JSON.stringify(mcpJson, null, 2) + '\n',
);

// ── Generate plugin.json ─────────────────────────────────────────
console.log('▸ Generating plugin.json...');
fs.mkdirSync(path.join(OUT, '.claude-plugin'), { recursive: true });

const pluginJson = {
  name: 'engram',
  version: pkg.version,
  description: 'Persistent memory for Claude Code — captures observations, saves knowledge, enables search across sessions.',
  author: { name: 'Engram' },
  repository: 'https://github.com/NoobyNull/Engram',
  license: 'MIT',
  skills: './skills/',
  mcpServers: './.mcp.json',
};

fs.writeFileSync(
  path.join(OUT, '.claude-plugin/plugin.json'),
  JSON.stringify(pluginJson, null, 2) + '\n',
);

// ── Generate package.json (native deps only) ─────────────────────
console.log('▸ Generating package.json...');
const pluginPkg = {
  name: 'engram-plugin',
  version: pkg.version,
  private: true,
  description: 'Engram plugin runtime — native dependencies',
  dependencies: {
    'better-sqlite3': pkg.dependencies['better-sqlite3'],
  },
  optionalDependencies: {
    'sqlite-vec': pkg.dependencies['sqlite-vec'],
    'fastembed': pkg.dependencies['fastembed'],
    '@anthropic-ai/claude-code': pkg.dependencies['@anthropic-ai/claude-code'],
  },
  engines: { node: '>=20.0.0' },
};

fs.writeFileSync(
  path.join(OUT, 'package.json'),
  JSON.stringify(pluginPkg, null, 2) + '\n',
);

// ── Generate setup.js (Setup hook) ───────────────────────────────
console.log('▸ Generating setup.js...');
const setupScript = `#!/usr/bin/env node
/**
 * Engram Plugin Setup
 * Installs native dependencies. Chained into the SessionStart hook.
 * Skips instantly after first successful install (version-gated marker file).
 */
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const MARKER = path.join(PLUGIN_ROOT, '.install-marker');
const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'package.json'), 'utf-8'));

// Skip if already installed for this version
if (fs.existsSync(MARKER)) {
  try {
    const marker = JSON.parse(fs.readFileSync(MARKER, 'utf-8'));
    if (marker.version === pkg.version) {
      process.exit(0);
    }
  } catch {}
}

const ok   = (msg) => console.error('  \\x1b[32mOK\\x1b[0m ' + msg);
const warn = (msg) => console.error('  \\x1b[33m!!\\x1b[0m ' + msg);
const fail = (msg) => console.error('  \\x1b[31mFAIL\\x1b[0m ' + msg);

console.error('\\n\\x1b[36m\\x1b[1mEngram\\x1b[0m Installing native dependencies...\\n');

try {
  execSync('npm install --production', {
    cwd: PLUGIN_ROOT,
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 120000,
  });
  ok('npm install complete');
} catch (err) {
  fail('npm install failed');
}

// Smoke test better-sqlite3
try {
  require(path.join(PLUGIN_ROOT, 'node_modules/better-sqlite3'));
  ok('better-sqlite3 loaded');
} catch (err) {
  fail('better-sqlite3 failed: ' + err.message);
  process.exit(1);
}

// Check optional deps
try {
  require(path.join(PLUGIN_ROOT, 'node_modules/sqlite-vec'));
  ok('sqlite-vec loaded');
} catch { warn('sqlite-vec not available (vector search disabled)'); }

try {
  require(path.join(PLUGIN_ROOT, 'node_modules/fastembed'));
  ok('fastembed loaded');
} catch { warn('fastembed not available (local embeddings disabled)'); }

// Write marker
fs.writeFileSync(MARKER, JSON.stringify({
  version: pkg.version,
  node: process.versions.node,
  installed: new Date().toISOString(),
}) + '\\n');

console.error('\\n\\x1b[32m\\x1b[1mEngram setup complete.\\x1b[0m\\n');
`;

fs.writeFileSync(path.join(OUT, 'scripts/setup.js'), setupScript);

// ── Summary ──────────────────────────────────────────────────────
const hookSize = fs.statSync(path.join(OUT, 'scripts/hook-runner.cjs')).size;
const mcpSize = fs.statSync(path.join(OUT, 'scripts/mcp-server.cjs')).size;

function fmtSize(bytes) {
  return (bytes / 1024).toFixed(0) + ' KB';
}

console.log('\n✓ Plugin built → plugin/');
console.log(`  scripts/hook-runner.cjs  ${fmtSize(hookSize)}`);
console.log(`  scripts/mcp-server.cjs   ${fmtSize(mcpSize)}`);
console.log(`  web/public/              ${fs.readdirSync(publicDst).length} files`);
console.log(`  skills/                  ${fs.readdirSync(skillsDst).length} skills`);
console.log('');
