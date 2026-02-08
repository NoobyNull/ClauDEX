#!/usr/bin/env node
/**
 * Pre-build native binaries for distribution
 *
 * This script compiles native modules and bundles them for the target platform,
 * avoiding the need for users to compile on installation.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_ROOT = path.join(__dirname, '..', 'plugin');
const BINARIES_DIR = path.join(PLUGIN_ROOT, 'prebuilt-binaries');

// Platform identifiers
const platform = process.platform; // linux, darwin, win32
const arch = process.arch; // x64, arm64
const nodeVersion = process.versions.modules; // ABI version
const platformKey = `${platform}-${arch}-${nodeVersion}`;

console.log(`\n📦 Pre-building native binaries for ${platformKey}\n`);

// Ensure plugin dependencies are installed
console.log('Installing plugin dependencies...');
execSync('npm install --production', {
  cwd: PLUGIN_ROOT,
  stdio: 'inherit',
});

// Create binaries directory
if (!fs.existsSync(BINARIES_DIR)) {
  fs.mkdirSync(BINARIES_DIR, { recursive: true });
}

const platformDir = path.join(BINARIES_DIR, platformKey);
if (fs.existsSync(platformDir)) {
  console.log(`\n⚠️  Binaries for ${platformKey} already exist. Removing old binaries...`);
  fs.rmSync(platformDir, { recursive: true, force: true });
}
fs.mkdirSync(platformDir, { recursive: true });

// Native modules to bundle
const nativeModules = [
  'better-sqlite3',
  'sqlite-vec',
  'fastembed',
];

console.log('\n📋 Bundling native modules:\n');

for (const moduleName of nativeModules) {
  const modulePath = path.join(PLUGIN_ROOT, 'node_modules', moduleName);

  if (!fs.existsSync(modulePath)) {
    console.log(`  ⚠️  ${moduleName} not found, skipping...`);
    continue;
  }

  const destPath = path.join(platformDir, moduleName);

  console.log(`  📁 ${moduleName}`);

  // Copy entire module directory
  copyRecursive(modulePath, destPath);

  console.log(`     ✓ Copied to prebuilt-binaries/${platformKey}/${moduleName}`);
}

// Write platform metadata
const metadata = {
  platform,
  arch,
  nodeVersion,
  platformKey,
  builtAt: new Date().toISOString(),
  modules: nativeModules.filter(m =>
    fs.existsSync(path.join(platformDir, m))
  ),
};

fs.writeFileSync(
  path.join(platformDir, 'metadata.json'),
  JSON.stringify(metadata, null, 2) + '\n'
);

console.log('\n✅ Pre-built binaries ready!');
console.log(`   Location: plugin/prebuilt-binaries/${platformKey}/`);
console.log(`   Modules: ${metadata.modules.join(', ')}\n`);

// Helper: Recursive copy
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      // Skip node_modules subdirectories to avoid bloat
      if (entry === 'node_modules' || entry === '.git') continue;

      copyRecursive(
        path.join(src, entry),
        path.join(dest, entry)
      );
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}
