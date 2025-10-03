#!/usr/bin/env node

/**
 * Version Increment Script
 * Automatically increments version number and updates CHANGELOG.md
 *
 * Usage:
 *   npm run version:patch  - 0.1.0 -> 0.1.1 (bug fixes)
 *   npm run version:minor  - 0.1.0 -> 0.2.0 (new features)
 *   npm run version:major  - 0.1.0 -> 1.0.0 (breaking changes)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get version increment type from command line args
const versionType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: patch, minor, or major');
  process.exit(1);
}

console.log(`\n🔧 Incrementing ${versionType} version...\n`);

// Paths
const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const dashboardComponentPath = path.join(rootDir, 'src/app/components/dashboard/dashboard.component.ts');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const oldVersion = packageJson.version;

// Increment version
const versionParts = oldVersion.split('.').map(Number);
switch (versionType) {
  case 'major':
    versionParts[0]++;
    versionParts[1] = 0;
    versionParts[2] = 0;
    break;
  case 'minor':
    versionParts[1]++;
    versionParts[2] = 0;
    break;
  case 'patch':
    versionParts[2]++;
    break;
}
const newVersion = versionParts.join('.');

console.log(`📦 Version: ${oldVersion} → ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ Updated package.json');

// Update dashboard component version
if (fs.existsSync(dashboardComponentPath)) {
  let dashboardContent = fs.readFileSync(dashboardComponentPath, 'utf8');
  dashboardContent = dashboardContent.replace(
    /version = '[^']+'/,
    `version = '${newVersion}'`
  );
  fs.writeFileSync(dashboardComponentPath, dashboardContent);
  console.log('✅ Updated dashboard component version');
}

// Get recent commits since last version
let commits = [];
try {
  const gitLog = execSync('git log --oneline --no-merges -10', { encoding: 'utf8' });
  commits = gitLog.trim().split('\n').filter(line => line.trim());
} catch (error) {
  console.warn('⚠️  Could not get git log');
}

// Update CHANGELOG.md
if (fs.existsSync(changelogPath)) {
  let changelog = fs.readFileSync(changelogPath, 'utf8');

  // Get current date
  const today = new Date().toISOString().split('T')[0];

  // Build changelog entry
  const changelogEntry = `## [${newVersion}] - ${today}\n\n`;

  // Replace [Unreleased] with new version
  changelog = changelog.replace(
    '## [Unreleased]',
    `## [Unreleased]\n\n${changelogEntry}`
  );

  fs.writeFileSync(changelogPath, changelog);
  console.log('✅ Updated CHANGELOG.md');
}

console.log('\n✨ Version increment complete!\n');
console.log('📝 Next steps:');
console.log('   1. Update CHANGELOG.md with your changes');
console.log('   2. Review the changes');
console.log('   3. Commit: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
console.log('   4. Tag: git tag v' + newVersion);
console.log('   5. Push: git push && git push --tags\n');
