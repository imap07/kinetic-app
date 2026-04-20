#!/usr/bin/env bash
# ─── Kinetic — Local Android Build ────────────────────────────────────────────
# Uso:
#   npm run build:android                          → APK de release (testing / Play verify)
#   npm run build:android:production               → AAB para Play Store
#   npm run build:android -- --no-bump             → reusa el versionCode actual (retry)
#   npm run build:android:production -- --no-bump  → idem para AAB
#
# Flags soportadas:
#   --production   → genera AAB (bundleRelease) en vez de APK (assembleRelease)
#   --no-bump      → NO incrementa versionCode, usa el que ya está en app.json
#                    (útil para rebuild después de un error sin gastar número)
#
# Comportamiento por default:
#   1. Bumpea iOS buildNumber + Android versionCode en lockstep (app.json)
#   2. Corre expo prebuild --platform android --clean
#   3. Copia credentials/keystore.properties → android/keystore.properties
#   4. Corre ./gradlew assembleRelease (o bundleRelease en --production)
#
# Prerequisitos (una vez):
#   1. Java 17+:  java -version
#   2. Android SDK (ANDROID_HOME) con build-tools, platform-tools
#   3. credentials/kinetic-upload-key.keystore  (descargado de EAS una vez)
#   4. credentials/keystore.properties          (copiado de .template y rellenado)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Android SDK ────────────────────────────────────────────────────────────────
# Set ANDROID_HOME if not already defined. Checks common locations.
if [ -z "${ANDROID_HOME:-}" ]; then
  if [ -d "/Volumes/SSD/android-sdk" ]; then
    export ANDROID_HOME="/Volumes/SSD/android-sdk"
  elif [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  fi
fi
if [ -n "${ANDROID_HOME:-}" ]; then
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"
fi

# ── Parse flags ────────────────────────────────────────────────────────────────
PRODUCTION=""
SKIP_BUMP=""
for arg in "$@"; do
  case "$arg" in
    --production|production) PRODUCTION="--production" ;;
    --no-bump)               SKIP_BUMP="1" ;;
    *)                       ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

KEYSTORE_PROPS="$PROJECT_DIR/credentials/keystore.properties"
KEYSTORE_FILE="$PROJECT_DIR/credentials/kinetic-upload-key.keystore"

# ── Verificar prerequisitos ────────────────────────────────────────────────────
echo ""
echo "🔍 Verificando prerequisitos..."

if [ ! -f "$KEYSTORE_FILE" ]; then
  echo ""
  echo "❌  Keystore no encontrado: credentials/kinetic-upload-key.keystore"
  echo ""
  echo "    Para descargarlo de EAS (una sola vez):"
  echo "      cd $PROJECT_DIR"
  echo "      eas credentials"
  echo "      → Android → production → Download credentials"
  echo "      Guarda el archivo en: credentials/kinetic-upload-key.keystore"
  echo ""
  exit 1
fi

if [ ! -f "$KEYSTORE_PROPS" ]; then
  echo ""
  echo "❌  Archivo de credenciales no encontrado: credentials/keystore.properties"
  echo ""
  echo "    Pasos:"
  echo "      cp credentials/keystore.properties.template credentials/keystore.properties"
  echo "      # Edita el archivo con tus passwords (los de 1Password)"
  echo ""
  exit 1
fi

if ! java -version &>/dev/null; then
  echo "❌  Java no encontrado. Instala con: brew install --cask temurin@17"
  exit 1
fi

echo "✅  Prerequisitos OK"
echo ""

# ── Production environment (NODE_ENV=production → loads .env.production) ─────
export NODE_ENV=production

# Source .env.production so we can validate the API URL before building.
if [ -f "$PROJECT_DIR/.env.production" ]; then
  # shellcheck source=/dev/null
  set -a
  . "$PROJECT_DIR/.env.production"
  set +a
fi

if [ -z "${EXPO_PUBLIC_API_URL:-}" ]; then
  echo "❌  EXPO_PUBLIC_API_URL is not set (missing .env.production?)."
  exit 1
fi

case "$EXPO_PUBLIC_API_URL" in
  https://*) ;;
  *)
    echo "❌  EXPO_PUBLIC_API_URL must start with https:// for release builds."
    echo "    Current value: $EXPO_PUBLIC_API_URL"
    echo "    Fix .env.production before rebuilding."
    exit 1
    ;;
esac

echo "🌐 Using API URL: $EXPO_PUBLIC_API_URL"
echo ""

# ── Validate RevenueCat keys ───────────────────────────────────────────────────
if [ -z "${EXPO_PUBLIC_REVENUECAT_IOS_KEY:-}" ] || \
   [ "${EXPO_PUBLIC_REVENUECAT_IOS_KEY:0:5}" != "appl_" ]; then
  echo "❌  EXPO_PUBLIC_REVENUECAT_IOS_KEY is missing or invalid (must start with appl_)."
  echo "    Fix .env.production before rebuilding."
  exit 1
fi

if [ -z "${EXPO_PUBLIC_REVENUECAT_ANDROID_KEY:-}" ] || \
   [ "${EXPO_PUBLIC_REVENUECAT_ANDROID_KEY:0:5}" != "goog_" ]; then
  echo "❌  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY is missing or invalid (must start with goog_)."
  echo "    Fix .env.production before rebuilding."
  exit 1
fi

echo "🔑 RevenueCat iOS key: ${EXPO_PUBLIC_REVENUECAT_IOS_KEY:0:12}…"
echo "🔑 RevenueCat Android key: ${EXPO_PUBLIC_REVENUECAT_ANDROID_KEY:0:12}…"
echo ""

# ── Validate Sentry DSN ────────────────────────────────────────────────────────
if [ -z "${EXPO_PUBLIC_SENTRY_DSN:-}" ] || \
   [ "${EXPO_PUBLIC_SENTRY_DSN:0:8}" != "https://" ]; then
  echo "❌  EXPO_PUBLIC_SENTRY_DSN is missing or invalid (must start with https://)."
  echo "    Fix .env.production before rebuilding."
  exit 1
fi
echo "📡 Sentry DSN: ${EXPO_PUBLIC_SENTRY_DSN:0:32}…"
echo ""

# ── Bump version (iOS buildNumber + Android versionCode in lockstep) ──────────
cd "$PROJECT_DIR"
if [ -z "$SKIP_BUMP" ]; then
  echo "🔢 Bumpeando versionCode..."
  node scripts/bump-build.js --no-prebuild
  echo ""
else
  echo "⏭  Saltando bump (--no-bump). Usando versionCode actual."
  echo ""
fi

# ── Prebuild ───────────────────────────────────────────────────────────────────
# Kill any gradle daemon holding open file handles inside android/ and then
# force-remove the folder. Expo's `--clean` uses rimraf which fails with
# ENOTEMPTY if another process (Android Studio, gradle daemon, Spotlight,
# a stray `adb`) is still touching files under android/app/build.
if [ -d "$PROJECT_DIR/android" ]; then
  echo "🧹 Matando gradle daemon y limpiando android/ a mano..."
  if [ -x "$PROJECT_DIR/android/gradlew" ]; then
    (cd "$PROJECT_DIR/android" && ./gradlew --stop >/dev/null 2>&1) || true
  fi
  # Give macOS a moment to release file handles (fseventsd, Spotlight, etc.)
  sleep 1
  rm -rf "$PROJECT_DIR/android"
  echo ""
fi

echo "🔨 Prebuild Android (limpio)..."
LANG=en_US.UTF-8 npx expo prebuild --platform android --clean
echo ""

# ── Inyectar credenciales de signing ──────────────────────────────────────────
echo "🔑 Inyectando keystore.properties en android/..."
cp "$KEYSTORE_PROPS" "$PROJECT_DIR/android/keystore.properties"
echo ""

# ── Build ──────────────────────────────────────────────────────────────────────
cd "$PROJECT_DIR/android"

if [ "$PRODUCTION" = "--production" ] || [ "$PRODUCTION" = "production" ]; then
  echo "📦 Generando AAB (Play Store)..."
  ./gradlew bundleRelease

  AAB="$PROJECT_DIR/android/app/build/outputs/bundle/release/app-release.aab"

  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "✅  AAB listo para el Play Store:"
  echo "    $AAB"
  echo ""
  echo "    Tamaño: $(du -sh "$AAB" | cut -f1)"
  echo ""
  echo "    Sube a Play Console:"
  echo "    Production → Releases → Create new release → Upload"
  echo "══════════════════════════════════════════════════════════════"
else
  echo "📦 Generando APK (release)..."
  ./gradlew assembleRelease

  APK="$PROJECT_DIR/android/app/build/outputs/apk/release/app-release.apk"

  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "✅  APK listo:"
  echo "    $APK"
  echo ""
  echo "    Tamaño: $(du -sh "$APK" | cut -f1)"
  echo "══════════════════════════════════════════════════════════════"
fi

echo ""
