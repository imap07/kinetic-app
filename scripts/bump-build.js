#!/usr/bin/env node
/**
 * Bump build number and run expo prebuild --clean
 *
 * Usage:
 *   npm run build          → bumps buildNumber +1, runs prebuild
 *   npm run build -- --no-prebuild  → only bumps, no prebuild
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appJsonPath = path.resolve(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Current build number
const current = parseInt(appJson.expo.ios?.buildNumber || '0', 10);
const next = current + 1;

// Update iOS buildNumber
if (!appJson.expo.ios) appJson.expo.ios = {};
appJson.expo.ios.buildNumber = String(next);

// Update Android versionCode too
if (!appJson.expo.android) appJson.expo.android = {};
appJson.expo.android.versionCode = next;

// Write back
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

console.log(`\n✅ Build number bumped: ${current} → ${next}`);
console.log(`   iOS buildNumber: "${next}"`);
console.log(`   Android versionCode: ${next}\n`);

// Run prebuild unless --no-prebuild flag
if (!process.argv.includes('--no-prebuild')) {
  console.log('🔨 Running expo prebuild --clean...\n');
  execSync('npx expo prebuild --clean', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, LANG: 'en_US.UTF-8' },
  });
  console.log(`\n🚀 Build ${next} ready! Open Xcode → Archive → Distribute`);
} else {
  console.log('Skipped prebuild (--no-prebuild flag)');
}
