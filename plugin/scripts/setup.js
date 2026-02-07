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
      process.exit(0);
    }
  } catch {}
}

const ok   = (msg) => console.error('  \x1b[32mOK\x1b[0m ' + msg);
const warn = (msg) => console.error('  \x1b[33m!!\x1b[0m ' + msg);
const fail = (msg) => console.error('  \x1b[31mFAIL\x1b[0m ' + msg);

console.error('\n\x1b[36m\x1b[1mEngram\x1b[0m Installing native dependencies...\n');

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
}) + '\n');

console.error('\n\x1b[32m\x1b[1mEngram setup complete.\x1b[0m\n');
