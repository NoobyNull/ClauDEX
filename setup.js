#!/usr/bin/env node
/**
 * Engram Setup — Cross-platform installer.
 *
 * Usage:
 *   node setup.js            Full install + register
 *   node setup.js --build    Build only (skip registration)
 *   node setup.js --help     Show help
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = __dirname;
const CLAUDE_SETTINGS_DIR = process.env.CLAUDE_SETTINGS_DIR || path.join(os.homedir(), '.claude');
const IS_WIN = process.platform === 'win32';

// ── Parse args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
let buildOnly = false;

for (const arg of args) {
  switch (arg) {
    case '--build':
      buildOnly = true;
      break;
    case '--help':
    case '-h':
      console.log(`Engram Setup

Usage:
  node setup.js            Full install + register
  node setup.js --build    Build only (skip registration)
  node setup.js --help     Show this help

Environment:
  ENGRAM_DATA_DIR         Override data directory (default: ~/.engram)
  CLAUDE_SETTINGS_DIR      Override Claude settings dir (default: ~/.claude)`);
      process.exit(0);
  }
}

// ── Output helpers ──────────────────────────────────────────────
const supportsColor = !IS_WIN || process.env.WT_SESSION || process.env.TERM_PROGRAM;
const c = {
  red: (s) => supportsColor ? `\x1b[31m${s}\x1b[0m` : s,
  green: (s) => supportsColor ? `\x1b[32m${s}\x1b[0m` : s,
  yellow: (s) => supportsColor ? `\x1b[33m${s}\x1b[0m` : s,
  cyan: (s) => supportsColor ? `\x1b[36m${s}\x1b[0m` : s,
  bold: (s) => supportsColor ? `\x1b[1m${s}\x1b[0m` : s,
  dim: (s) => supportsColor ? `\x1b[2m${s}\x1b[0m` : s,
};
const ok   = (msg) => console.log(`  ${c.green('✓')} ${msg}`);
const warn = (msg) => console.log(`  ${c.yellow('⚠')} ${msg}`);
const fail = (msg) => console.log(`  ${c.red('✗')} ${msg}`);
const step = (msg) => console.log(`\n${c.cyan('▸')} ${c.bold(msg)}`);

function run(cmd, opts = {}) {
  const result = execSync(cmd, { cwd: PLUGIN_DIR, stdio: 'pipe', ...opts });
  return result ? result.toString().trim() : '';
}

function which(cmd) {
  try {
    run(IS_WIN ? `where ${cmd}` : `command -v ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

// ── Banner ──────────────────────────────────────────────────────
console.log();
console.log(c.bold('  ╔═══════════════════════════════════════╗'));
console.log(c.bold(`  ║  ${c.cyan('Clau')}${c.yellow('DEX')}  Setup                      ║`));
console.log(c.bold('  ║  Persistent Memory for Claude Code    ║'));
console.log(c.bold('  ╚═══════════════════════════════════════╝'));

// ─────────────────────────────────────────────────────────────────
// PHASE 1: Prerequisites
// ─────────────────────────────────────────────────────────────────
step('Checking prerequisites...');

if (!which('node')) {
  fail('Node.js not found. Please install Node.js >= 20.');
  process.exit(1);
}
const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
if (nodeVersion < 20) {
  fail(`Node.js >= 20 required (found v${process.versions.node})`);
  process.exit(1);
}
ok(`Node.js v${process.versions.node}`);

if (!which('npm')) {
  fail('npm not found.');
  process.exit(1);
}
const npmVersion = run('npm -v');
ok(`npm v${npmVersion}`);

const hasClaude = which('claude');
if (hasClaude) {
  ok('Claude Code CLI found');
} else {
  warn('Claude Code CLI not found (optional)');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 2: Install dependencies
// ─────────────────────────────────────────────────────────────────
step('Installing dependencies...');

try {
  run('npm install', { stdio: 'inherit' });
  ok('Dependencies installed');
} catch {
  fail('npm install failed');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────
// PHASE 3: Build
// ─────────────────────────────────────────────────────────────────
step('Building plugin...');

try {
  run('npx tsc', { stdio: 'inherit' });
  ok('TypeScript compiled → dist/');
} catch {
  fail('TypeScript compilation failed');
  process.exit(1);
}

try {
  run('node scripts/build-plugin.js', { stdio: 'inherit' });
  ok('Plugin bundled → plugin/');
} catch {
  fail('Plugin build failed');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────
// PHASE 4: Generate hook configuration
// ─────────────────────────────────────────────────────────────────
step('Generating hook configuration...');

const hooksDir = path.join(PLUGIN_DIR, 'hooks');
fs.mkdirSync(hooksDir, { recursive: true });

function hookCommand(event) {
  return `node "\${CLAUDE_PLUGIN_ROOT}/plugin/scripts/hook-runner.cjs" ${event}`;
}

const hooksJson = {
  hooks: {
    Setup: [{
      matcher: '*',
      hooks: [{
        type: 'command',
        command: `node "\${CLAUDE_PLUGIN_ROOT}/plugin/scripts/setup.js"`,
        timeout: 120,
      }],
    }],
    SessionStart: [{
      matcher: 'startup|resume',
      hooks: [{ type: 'command', command: hookCommand('SessionStart') }],
    }],
    UserPromptSubmit: [{
      hooks: [{ type: 'command', command: hookCommand('UserPromptSubmit') }],
    }],
    PostToolUse: [{
      matcher: 'Read|Edit|Write|Bash|Grep|Glob|WebFetch|WebSearch',
      hooks: [{ type: 'command', command: hookCommand('PostToolUse') }],
    }],
    PreToolUse: [{
      matcher: 'Bash',
      hooks: [{ type: 'command', command: hookCommand('PreToolUse') }],
    }],
    PreCompact: [{
      hooks: [{ type: 'command', command: hookCommand('PreCompact') }],
    }],
    SessionEnd: [{
      hooks: [{ type: 'command', command: hookCommand('SessionEnd') }],
    }],
  },
};

fs.writeFileSync(path.join(hooksDir, 'hooks.json'), JSON.stringify(hooksJson, null, 2) + '\n');
ok('hooks/hooks.json generated');

// ─────────────────────────────────────────────────────────────────
// PHASE 5: Generate MCP server configuration
// ─────────────────────────────────────────────────────────────────
step('Generating MCP server configuration...');

const mcpJson = {
  mcpServers: {
    engram: {
      command: 'node',
      args: ['${CLAUDE_PLUGIN_ROOT}/plugin/scripts/mcp-server.cjs'],
      env: {
        ENGRAM_PLUGIN_ROOT: '${CLAUDE_PLUGIN_ROOT}',
      },
    },
  },
};

fs.writeFileSync(path.join(PLUGIN_DIR, '.mcp.json'), JSON.stringify(mcpJson, null, 2) + '\n');
ok('.mcp.json generated');

// ─────────────────────────────────────────────────────────────────
// PHASE 6: Update plugin.json
// ─────────────────────────────────────────────────────────────────
step('Updating plugin manifest...');

const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'package.json'), 'utf-8'));

const pluginJson = {
  name: 'engram',
  version: pkg.version,
  description: 'Persistent memory for Claude Code — captures observations, saves knowledge, enables search across sessions.',
  author: { name: 'Engram' },
  license: 'MIT',
  skills: 'skills/',
  hooks: 'hooks/hooks.json',
  mcpServers: '.mcp.json',
};

const pluginDir = path.join(PLUGIN_DIR, '.claude-plugin');
fs.mkdirSync(pluginDir, { recursive: true });
fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify(pluginJson, null, 2) + '\n');
ok(`plugin.json updated (v${pkg.version})`);

// ─────────────────────────────────────────────────────────────────
// PHASE 7: Verify plugin bundles
// ─────────────────────────────────────────────────────────────────
step('Verifying plugin bundles...');

const pluginScripts = path.join(PLUGIN_DIR, 'plugin', 'scripts');
const hookRunner = path.join(pluginScripts, 'hook-runner.cjs');
const mcpServer = path.join(pluginScripts, 'mcp-server.cjs');
const setupScript = path.join(pluginScripts, 'setup.js');

if (fs.existsSync(hookRunner)) {
  ok(`hook-runner.cjs (${(fs.statSync(hookRunner).size / 1024).toFixed(0)} KB)`);
} else {
  fail('hook-runner.cjs missing');
}

if (fs.existsSync(mcpServer)) {
  ok(`mcp-server.cjs (${(fs.statSync(mcpServer).size / 1024).toFixed(0)} KB)`);
} else {
  fail('mcp-server.cjs missing');
}

if (fs.existsSync(setupScript)) {
  ok('setup.js');
} else {
  fail('setup.js missing');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 8: Verify skills
// ─────────────────────────────────────────────────────────────────
step('Checking skills...');

const skillsDir = path.join(PLUGIN_DIR, 'skills');
let skillCount = 0;
if (fs.existsSync(skillsDir)) {
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        skillCount++;
        console.log(`    ${c.dim('/' + entry.name)}`);
      }
    }
  }
}
if (skillCount > 0) {
  ok(`${skillCount} skills found`);
} else {
  warn('No skills found in skills/');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 9: Register with Claude Code
// ─────────────────────────────────────────────────────────────────
if (!buildOnly) {
  step('Registering plugin...');

  let registered = false;
  const settingsLocal = path.join(PLUGIN_DIR, '.claude', 'settings.local.json');

  if (fs.existsSync(CLAUDE_SETTINGS_DIR)) {
    fs.mkdirSync(path.dirname(settingsLocal), { recursive: true });

    let cfg = {};
    try {
      if (fs.existsSync(settingsLocal)) {
        cfg = JSON.parse(fs.readFileSync(settingsLocal, 'utf-8'));
      }
    } catch { /* start fresh */ }

    cfg.plugins = cfg.plugins || [];
    const entry = { type: 'local', path: PLUGIN_DIR };
    if (!cfg.plugins.some((p) => p.path === entry.path)) {
      cfg.plugins.push(entry);
    }

    fs.writeFileSync(settingsLocal, JSON.stringify(cfg, null, 2) + '\n');
    registered = true;
    ok('Plugin registered in .claude/settings.local.json');
  }

  if (!registered) {
    warn(`Could not auto-register. Use: claude --plugin-dir "${PLUGIN_DIR}"`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Done
// ─────────────────────────────────────────────────────────────────
console.log();
console.log(c.bold('  ╔═══════════════════════════════════════╗'));
console.log(c.bold(`  ║  ${c.green('✓')}  Engram is ready!                  ║`));
console.log(c.bold('  ╚═══════════════════════════════════════╝'));
console.log();

console.log(c.bold('QUICK START'));
console.log();
console.log('  Launch Claude Code with Engram loaded:');
console.log();
console.log(`    ${c.cyan(`claude --plugin-dir "${PLUGIN_DIR}"`)}`);
console.log();

console.log(c.bold('SLASH COMMANDS'));
console.log();
console.log(`  ${c.cyan('/remember')} <content>    Save to persistent memory`);
console.log(`  ${c.cyan('/recall')}   <query>      Search all memory`);
console.log(`  ${c.cyan('/forget')}   <what>       Delete memories`);
console.log(`  ${c.cyan('/stash')}    [label]      Park current conversation`);
console.log(`  ${c.cyan('/resume')}                Resume a stashed conversation`);
console.log(`  ${c.cyan('/checkpoint')} [label]    Create session save point`);
console.log(`  ${c.cyan('/resolve')}               Handle memory conflicts`);
console.log();

console.log(c.bold('MCP TOOLS') + ' (9 tools available to Claude automatically)');
console.log();
console.log('  memory_search    memory_save      memory_timeline');
console.log('  memory_get       memory_forget    memory_stash');
console.log('  memory_resume    memory_stats     memory_resolve');
console.log();

console.log(c.bold('WEB UI'));
console.log();
console.log(`  ${c.cyan('http://127.0.0.1:37820')}`);
console.log(`  ${c.dim('Dashboard, Search, Timeline, Knowledge Graph, Settings')}`);
console.log();

console.log(c.bold('FILES'));
console.log();
console.log(`  Data:     ${c.dim('~/.engram/')}`);
console.log(`  Config:   ${c.dim('~/.engram/settings.json')}`);
console.log(`  Database: ${c.dim('~/.engram/engram.db')}`);
console.log(`  Plugin:   ${c.dim(PLUGIN_DIR)}`);
console.log();

console.log(`${c.dim('Re-run setup after moving the directory to update paths.')}`);
console.log();
