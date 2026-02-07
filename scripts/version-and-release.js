#!/usr/bin/env node
/**
 * Auto-bump version, sync across all files, commit, tag, and push to GitHub.
 *
 * Usage:
 *   node scripts/version-and-release.js [patch|minor|major]
 *
 * Defaults to 'patch' if no argument provided.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bumpType = process.argv[2] || 'patch';

// Validate bump type
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error(`Error: Invalid bump type "${bumpType}". Use patch, minor, or major.`);
  process.exit(1);
}

console.log(`\n🔧 Bumping ${bumpType} version...\n`);

try {
  // Change to root directory
  process.chdir(root);

  // Check if there are uncommitted changes
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
      console.log('📝 Uncommitted changes detected. Staging all changes...');
      execSync('git add .', { stdio: 'inherit' });
    }
  } catch (err) {
    console.warn('Warning: Could not check git status. Continuing anyway...');
  }

  // Bump version using npm version (this also creates a git commit and tag)
  console.log(`Running: npm version ${bumpType} --no-git-tag-version`);
  execSync(`npm version ${bumpType} --no-git-tag-version`, { stdio: 'inherit' });

  // Read the new version
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  const newVersion = pkg.version;
  console.log(`\n✅ Version bumped to ${newVersion}\n`);

  // Sync version across all files
  console.log('🔄 Syncing version across all files...');
  execSync('node scripts/sync-version.js', { stdio: 'inherit' });

  // Git commit
  console.log('\n📦 Committing version bump...');
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "Bump version to ${newVersion}"`, { stdio: 'inherit' });

  // Git tag
  console.log(`\n🏷️  Creating tag v${newVersion}...`);
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });

  // Push to GitHub
  console.log('\n🚀 Pushing to GitHub...');
  execSync('git push', { stdio: 'inherit' });
  execSync('git push --tags', { stdio: 'inherit' });

  console.log(`\n✨ Successfully released v${newVersion} to GitHub!\n`);
} catch (error) {
  console.error('\n❌ Error during version bump and release:');
  console.error(error.message);
  process.exit(1);
}
