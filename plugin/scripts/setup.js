#!/usr/bin/env node
/**
 * Engram Plugin Setup
 * Installs native dependencies using pre-built binaries when available.
 * Falls back to npm install if binaries don't match current platform.
 */
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const MARKER = path.join(PLUGIN_ROOT, '.install-marker');
const BINARIES_DIR = path.join(PLUGIN_ROOT, 'prebuilt-binaries');
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
console.error('│ Installing native dependencies...                          │');
console.error('│ \x1b[2mClaude will be ready once this completes.\x1b[0m                │');
console.error('╰─────────────────────────────────────────────────────────────╯\n');

// Check for pre-built binaries
const platformKey = `${process.platform}-${process.arch}-${process.versions.modules}`;
const prebuiltDir = path.join(BINARIES_DIR, platformKey);
const metadataPath = path.join(prebuiltDir, 'metadata.json');

if (fs.existsSync(metadataPath)) {
  info('Found pre-built binaries for ' + platformKey);
  info('Using fast installation (5-10 seconds)...\n');

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const nodeModules = path.join(PLUGIN_ROOT, 'node_modules');

    // Create node_modules if it doesn't exist
    if (!fs.existsSync(nodeModules)) {
      fs.mkdirSync(nodeModules, { recursive: true });
    }

    // Copy pre-built modules
    for (const moduleName of metadata.modules) {
      const src = path.join(prebuiltDir, moduleName);
      const dest = path.join(nodeModules, moduleName);

      info(`Installing ${moduleName}...`);
      copyRecursive(src, dest);
    }

    console.error('');
    ok('Pre-built binaries installed successfully');
  } catch (err) {
    console.error('');
    warn('Failed to use pre-built binaries: ' + err.message);
    warn('Falling back to npm install...\n');
    installFromNpm();
  }
} else {
  info('No pre-built binaries for ' + platformKey);
  info('Compiling from source (2-3 minutes)...\n');
  installFromNpm();
}

function installFromNpm() {
  try {
    info('Downloading packages...');
    info('Compiling native modules (better-sqlite3, sqlite-vec, fastembed)...');
    info('This may take 2-3 minutes - please wait...\n');

    execSync('npm install --production --no-audit --no-fund --loglevel=warn', {
      cwd: PLUGIN_ROOT,
      stdio: ['pipe', 'pipe', 'inherit'],
      timeout: 300000, // 5 minutes for native compilation
      env: { ...process.env, MAKEFLAGS: '-j4' },
    });

    console.error('');
    ok('Dependencies installed successfully');
  } catch (err) {
    console.error('');
    fail('npm install failed');
    if (err.code) fail('Exit code: ' + err.code);
    if (err.signal) fail('Signal: ' + err.signal);
    fail('This usually means:');
    fail('  - Native module compilation failed (check node-gyp/python)');
    fail('  - Network timeout (try again)');
    fail('  - Insufficient disk space or memory');
    process.exit(1);
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
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
