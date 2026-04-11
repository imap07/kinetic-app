#!/usr/bin/env bash
# ─── Kinetic — Local Android Build ────────────────────────────────────────────
# Uso:
#   npm run build:android             → APK de release (testing / Play Console verify)
#   npm run build:android:production  → AAB para Play Store
#
# Prerequisitos:
#   1. Java 17+:  java -version
#   2. Android build-tools 34 instalados:
#      sdkmanager "build-tools;34.0.0"
#   3. credentials/kinetic-upload-key.keystore  (descargado de EAS una vez)
#   4. credentials/keystore.properties          (copiado de .template y rellenado)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PRODUCTION=${1:-""}
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

# ── Prebuild ───────────────────────────────────────────────────────────────────
echo "🔨 Prebuild Android (limpio)..."
cd "$PROJECT_DIR"
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
