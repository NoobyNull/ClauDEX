#!/usr/bin/env node
/**
 * Reads the version from package.json and stamps it into all files
 * that carry their own version field.
 *
 * Usage:
 *   node scripts/sync-version.js          # sync from package.json
 *   node scripts/sync-version.js 2.1.0    # override to specific version
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const version = process.argv[2] || pkg.version;

let changed = 0;

// ── .claude-plugin/plugin.json ──────────────────────────────────
const pluginPath = path.join(root, '.claude-plugin', 'plugin.json');
if (fs.existsSync(pluginPath)) {
  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8'));
  if (plugin.version !== version) {
    plugin.version = version;
    fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');
    console.log(`  .claude-plugin/plugin.json  ${plugin.version} → ${version}`);
    changed++;
  }
}

// ── plugin/package.json ─────────────────────────────────────────
const pluginPkgPath = path.join(root, 'plugin', 'package.json');
if (fs.existsSync(pluginPkgPath)) {
  const pluginPkg = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf-8'));
  if (pluginPkg.version !== version) {
    pluginPkg.version = version;
    fs.writeFileSync(pluginPkgPath, JSON.stringify(pluginPkg, null, 2) + '\n');
    console.log(`  plugin/package.json         ${pluginPkg.version} → ${version}`);
    changed++;
  }
}

// ── package.json (only if override arg was given) ───────────────
if (process.argv[2] && pkg.version !== version) {
  pkg.version = version;
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  package.json                ${pkg.version} → ${version}`);
  changed++;
}

if (changed === 0) {
  console.log(`All files already at v${version}`);
} else {
  console.log(`\nSynced ${changed} file(s) to v${version}`);
}
