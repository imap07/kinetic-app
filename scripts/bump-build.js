#!/usr/bin/env node
/**
 * Bump build number and run expo prebuild --clean FOR iOS ONLY.
 *
 * Usage:
 *   npm run build                   → bumps buildNumber +1, regenerates ios/
 *   npm run build -- --no-prebuild  → only bumps version numbers, no prebuild
 *
 * Notes:
 *   - Bumps BOTH iOS buildNumber and Android versionCode so the two stores
 *     stay in lockstep. Android picks up the new versionCode the next time
 *     you run `npm run build:android`.
 *   - `expo prebuild --clean --platform ios` regenerates ONLY the ios/ folder,
 *     leaving android/ untouched. This is critical because android/ contains
 *     the signing credentials (keystore.properties) copied by build-android.sh
 *     which a full clean would wipe.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = path.resolve(__dirname, '..');
const appJsonPath = path.join(projectDir, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// ── Load .env.production so we can validate the API URL before prebuild ─────
// Minimal .env parser so we don't add a dotenv dependency. Handles KEY=value
// and KEY="value", ignores comments and blank lines.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const envProd = loadEnvFile(path.join(projectDir, '.env.production'));
const apiUrl = envProd.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  console.error('\n❌  EXPO_PUBLIC_API_URL is not set (missing .env.production?).');
  console.error('    Release builds require the production backend URL.\n');
  process.exit(1);
}
if (!apiUrl.startsWith('https://')) {
  console.error('\n❌  EXPO_PUBLIC_API_URL must start with https:// for release builds.');
  console.error(`    Current value: ${apiUrl}`);
  console.error('    Fix .env.production before rebuilding.\n');
  process.exit(1);
}
console.log(`🌐 Using API URL: ${apiUrl}`);

// ── Validate RevenueCat keys ─────────────────────────────────────────────────
const rcIosKey = envProd.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const rcAndroidKey = envProd.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

if (!rcIosKey || !rcIosKey.startsWith('appl_')) {
  console.error('\n❌  EXPO_PUBLIC_REVENUECAT_IOS_KEY is missing or invalid (must start with appl_).');
  console.error('    Fix .env.production before rebuilding.\n');
  process.exit(1);
}
if (!rcAndroidKey || !rcAndroidKey.startsWith('goog_')) {
  console.error('\n❌  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY is missing or invalid (must start with goog_).');
  console.error('    Fix .env.production before rebuilding.\n');
  process.exit(1);
}
console.log(`🔑 RevenueCat iOS key: ${rcIosKey.slice(0, 12)}…`);
console.log(`🔑 RevenueCat Android key: ${rcAndroidKey.slice(0, 12)}…`);

// ── Validate Sentry DSN ──────────────────────────────────────────────────────
const sentryDsn = envProd.EXPO_PUBLIC_SENTRY_DSN ?? process.env.EXPO_PUBLIC_SENTRY_DSN;
if (!sentryDsn || !sentryDsn.startsWith('https://')) {
  console.error('\n❌  EXPO_PUBLIC_SENTRY_DSN is missing or invalid (must start with https://).');
  console.error('    Fix .env.production before rebuilding.\n');
  process.exit(1);
}
console.log(`📡 Sentry DSN: ${sentryDsn.slice(0, 32)}…`);

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

// Run prebuild (iOS only) unless --no-prebuild flag
if (!process.argv.includes('--no-prebuild')) {
  console.log('🔨 Running expo prebuild --platform ios --clean (NODE_ENV=production)...\n');
  execSync('npx expo prebuild --platform ios --clean', {
    cwd: projectDir,
    stdio: 'inherit',
    env: { ...process.env, LANG: 'en_US.UTF-8', NODE_ENV: 'production' },
  });
  console.log(`\n🚀 iOS build ${next} ready! Open Xcode → Archive → Distribute`);
  console.log(`   (android/ folder untouched — use 'npm run build:android' for that platform)`);
} else {
  console.log('Skipped prebuild (--no-prebuild flag)');
}
