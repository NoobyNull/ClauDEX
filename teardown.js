#!/usr/bin/env node
/**
 * Engram Teardown — Cross-platform uninstaller.
 *
 * Usage:
 *   node teardown.js             Unregister plugin, remove build artifacts
 *   node teardown.js --purge     Also delete ~/.engram (database + config)
 *   node teardown.js --help      Show help
 */

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = __dirname;
const DATA_DIR = process.env.ENGRAM_DATA_DIR || path.join(os.homedir(), '.engram');
const IS_WIN = process.platform === 'win32';

// ── Parse args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
let purge = false;

for (const arg of args) {
  switch (arg) {
    case '--purge':
      purge = true;
      break;
    case '--help':
    case '-h':
      console.log(`Engram Teardown

Usage:
  node teardown.js             Unregister + remove build artifacts
  node teardown.js --purge     Also delete ~/.engram (database, config, all data)
  node teardown.js --help      Show this help

Environment:
  ENGRAM_DATA_DIR             Override data directory (default: ~/.engram)
  CLAUDE_SETTINGS_DIR          Override Claude settings dir (default: ~/.claude)`);
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
const skip = (msg) => console.log(`  ${c.dim('–')} ${msg}`);
const step = (msg) => console.log(`\n${c.cyan('▸')} ${c.bold(msg)}`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ── Banner ──────────────────────────────────────────────────────
console.log();
console.log(c.bold('  ╔═══════════════════════════════════════╗'));
console.log(c.bold(`  ║  ${c.cyan('Clau')}${c.yellow('DEX')}  Teardown                    ║`));
console.log(c.bold(`  ║  ${purge ? c.red('Full purge mode') : 'Clean uninstall'}                      ║`));
console.log(c.bold('  ╚═══════════════════════════════════════╝'));

console.log();
console.log('  This will:');
console.log(`    ${c.dim('•')} Remove plugin registration from Claude Code`);
console.log(`    ${c.dim('•')} Delete dist/, node_modules/`);
console.log(`    ${c.dim('•')} Remove generated hooks.json and .mcp.json`);
if (purge) {
  console.log(`    ${c.red('•')} ${c.red(`Delete ${DATA_DIR} (database + all saved memories)`)}`);
}
console.log();

const confirm = await ask('  Continue? [y/N] ');
if (!/^[Yy]$/.test(confirm.trim())) {
  console.log(`\n  ${c.dim('Aborted.')}\n`);
  rl.close();
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────
// PHASE 1: Unregister from Claude Code
// ─────────────────────────────────────────────────────────────────
step('Unregistering plugin from Claude Code...');

const settingsLocal = path.join(PLUGIN_DIR, '.claude', 'settings.local.json');
if (fs.existsSync(settingsLocal)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(settingsLocal, 'utf-8'));
    if (cfg.plugins && Array.isArray(cfg.plugins)) {
      cfg.plugins = cfg.plugins.filter((p) => p.path !== PLUGIN_DIR);
      if (cfg.plugins.length === 0) delete cfg.plugins;
    }
    if (Object.keys(cfg).length === 0) {
      fs.unlinkSync(settingsLocal);
      ok('Removed settings.local.json (was only Engram)');
    } else {
      fs.writeFileSync(settingsLocal, JSON.stringify(cfg, null, 2) + '\n');
      ok('Removed Engram entry from settings.local.json');
    }
  } catch {
    skip('settings.local.json not parseable, skipped');
  }
} else {
  skip('No settings.local.json found');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 2: Stop web UI if running
// ─────────────────────────────────────────────────────────────────
step('Stopping web UI...');

const webPort = 37820;
const portInUse = await checkPort(webPort);
if (portInUse) {
  try {
    // Try a graceful HTTP request to check it's actually Engram
    // then kill via platform-appropriate method
    await killProcessOnPort(webPort);
    ok(`Stopped process on port ${webPort}`);
  } catch {
    warn(`Could not stop process on port ${webPort}`);
  }
} else {
  skip('Web UI not running');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 3: Remove generated config files
// ─────────────────────────────────────────────────────────────────
step('Removing generated configuration...');

removeFile(path.join(PLUGIN_DIR, 'hooks', 'hooks.json'), 'hooks/hooks.json');
removeFile(path.join(PLUGIN_DIR, '.mcp.json'), '.mcp.json');

// ─────────────────────────────────────────────────────────────────
// PHASE 4: Remove build artifacts
// ─────────────────────────────────────────────────────────────────
step('Removing build artifacts...');

removeDir(path.join(PLUGIN_DIR, 'dist'), 'dist/');
removeDir(path.join(PLUGIN_DIR, 'node_modules'), 'node_modules/');

// ─────────────────────────────────────────────────────────────────
// PHASE 5: Purge data (optional)
// ─────────────────────────────────────────────────────────────────
if (purge) {
  step('Purging data directory...');

  if (fs.existsSync(DATA_DIR)) {
    const dbPath = path.join(DATA_DIR, 'engram.db');
    const dbSize = fs.existsSync(dbPath) ? formatBytes(fs.statSync(dbPath).size) : '0 B';
    const totalSize = formatBytes(dirSize(DATA_DIR));
    console.log(`    ${c.dim(`Database: ${dbSize}`)}`);
    console.log(`    ${c.dim(`Total:    ${totalSize}`)}`);
    console.log();

    const purgeConfirm = await ask(`  Delete ${DATA_DIR} permanently? [y/N] `);
    if (/^[Yy]$/.test(purgeConfirm.trim())) {
      fs.rmSync(DATA_DIR, { recursive: true, force: true });
      ok(`Deleted ${DATA_DIR}`);
    } else {
      skip(`Kept ${DATA_DIR}`);
    }
  } else {
    skip(`${DATA_DIR} not found`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Done
// ─────────────────────────────────────────────────────────────────
console.log();
console.log(c.bold('  ╔═══════════════════════════════════════╗'));
console.log(c.bold(`  ║  ${c.green('✓')}  Engram has been removed.          ║`));
console.log(c.bold('  ╚═══════════════════════════════════════╝'));
console.log();

if (!purge) {
  console.log(`  ${c.dim(`Your data is still at ${DATA_DIR}`)}`);
  console.log(`  ${c.dim('To delete it too, re-run: node teardown.js --purge')}`);
  console.log();
}

console.log(`  ${c.dim('To reinstall: node setup.js')}`);
console.log();

rl.close();

// ═════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════

function removeFile(filePath, label) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    ok(`Removed ${label}`);
  } else {
    skip(`${label} not found`);
  }
}

function removeDir(dirPath, label) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    ok(`Removed ${label}`);
  } else {
    skip(`${label} not found`);
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { resolve(false); });
    socket.connect(port, '127.0.0.1');
  });
}

async function killProcessOnPort(port) {
  const { execSync } = await import('node:child_process');
  try {
    if (IS_WIN) {
      // Windows: netstat to find PID, taskkill to stop it
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { stdio: 'pipe' }).toString();
      const match = output.match(/\s(\d+)\s*$/m);
      if (match) {
        execSync(`taskkill /PID ${match[1]} /F`, { stdio: 'pipe' });
      }
    } else {
      // Unix: lsof or fuser
      try {
        const pid = execSync(`lsof -ti :${port}`, { stdio: 'pipe' }).toString().trim();
        if (pid) process.kill(parseInt(pid, 10));
      } catch {
        // lsof not available, try fuser
        execSync(`fuser -k ${port}/tcp`, { stdio: 'pipe' });
      }
    }
  } catch {
    // Best-effort — process may have already stopped
  }
}

function dirSize(dir) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile()) {
        total += fs.statSync(full).size;
      } else if (entry.isDirectory()) {
        total += dirSize(full);
      }
    }
  } catch { /* permission error or similar */ }
  return total;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}
