#!/usr/bin/env node
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
      console.error('\x1b[32m✓\x1b[0m Engram ready (v' + pkg.version + ')');
      process.exit(0);
    }
  } catch {}
}

const ok   = (msg) => console.error('  \x1b[32m✓\x1b[0m ' + msg);
const warn = (msg) => console.error('  \x1b[33m⚠\x1b[0m ' + msg);
const fail = (msg) => console.error('  \x1b[31m✗\x1b[0m ' + msg);
const info = (msg) => console.error('  \x1b[36mℹ\x1b[0m ' + msg);

console.error('\n╭─────────────────────────────────────────────────────────────╮');
console.error('│ \x1b[36m\x1b[1mEngram First-Time Setup\x1b[0m                                  │');
console.error('│ Installing native dependencies (30-60 seconds)...          │');
console.error('│ \x1b[2mClaude will be ready once this completes.\x1b[0m                │');
console.error('╰─────────────────────────────────────────────────────────────╯\n');

info('Starting npm install...');

try {
  info('Downloading packages...');
  info('Compiling native modules (better-sqlite3, sqlite-vec, fastembed)...');
  info('This may take a minute - please wait...\n');

  execSync('npm install --production --loglevel=error', {
    cwd: PLUGIN_ROOT,
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 120000,
  });

  console.error('');
  ok('Dependencies installed successfully');
} catch (err) {
  console.error('');
  fail('npm install failed: ' + (err.message || 'unknown error'));
  process.exit(1);
}

// Smoke test better-sqlite3
info('Verifying packages...\n');

try {
  require(path.join(PLUGIN_ROOT, 'node_modules/better-sqlite3'));
  ok('Database engine (better-sqlite3)');
} catch (err) {
  console.error('');
  fail('Database engine failed to load: ' + err.message);
  fail('Engram cannot start without better-sqlite3');
  process.exit(1);
}

// Check optional deps
try {
  require(path.join(PLUGIN_ROOT, 'node_modules/sqlite-vec'));
  ok('Vector search (sqlite-vec)');
} catch { warn('Vector search unavailable (semantic search disabled)'); }

try {
  require(path.join(PLUGIN_ROOT, 'node_modules/fastembed'));
  ok('Local embeddings (fastembed)');
} catch { warn('Local embeddings unavailable (will use API embeddings)'); }

// Write marker
fs.writeFileSync(MARKER, JSON.stringify({
  version: pkg.version,
  node: process.versions.node,
  installed: new Date().toISOString(),
}) + '\n');

console.error('\n╭─────────────────────────────────────────────────────────────╮');
console.error('│ \x1b[32m\x1b[1m✓ Engram Setup Complete!\x1b[0m                                 │');
console.error('│ Memory system is ready. Starting Claude...                 │');
console.error('╰─────────────────────────────────────────────────────────────╯\n');
