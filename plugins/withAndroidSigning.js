const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Injects release signing config into android/app/build.gradle during prebuild.
 *
 * Reads credentials from android/keystore.properties (gitignored).
 * If the file does not exist the release build still works but uses debug signing.
 *
 * keystore.properties format (relative to android/):
 *   storeFile=../../credentials/kinetic-upload-key.keystore
 *   storePassword=YOUR_STORE_PASSWORD
 *   keyAlias=kinetic-upload
 *   keyPassword=YOUR_KEY_PASSWORD
 */
module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Idempotent — skip if already injected
    if (contents.includes('keystorePropertiesFile')) {
      return config;
    }

    // ── 1. Insert keystore.properties reader BEFORE android { block ────────
    const propertiesLoader = `// ── Local signing credentials ──────────────────────────────────────
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

`;

    // The Expo-generated build.gradle always starts the android block with exactly:
    //   "android {\n"
    contents = contents.replace('android {\n', propertiesLoader + 'android {\n');

    // ── 2. Add release signingConfig AFTER the debug block, BEFORE signingConfigs closes
    // The known tail of the debug block in the Expo template is:
    //   "            keyPassword 'android'\n        }\n    }"
    const debugBlockTail = "            keyPassword 'android'\n        }\n    }";
    const debugBlockWithRelease =
      "            keyPassword 'android'\n" +
      '        }\n' +
      '        release {\n' +
      '            if (keystorePropertiesFile.exists()) {\n' +
      "                storeFile file(keystoreProperties['storeFile'])\n" +
      "                storePassword keystoreProperties['storePassword']\n" +
      "                keyAlias keystoreProperties['keyAlias']\n" +
      "                keyPassword keystoreProperties['keyPassword']\n" +
      '            }\n' +
      '        }\n' +
      '    }';

    if (contents.includes(debugBlockTail)) {
      contents = contents.replace(debugBlockTail, debugBlockWithRelease);
    } else {
      // Fallback: try with single quotes variant just in case
      console.warn('[withAndroidSigning] Could not find debug signingConfig tail — signing config NOT injected');
    }

    // ── 3. Point release buildType to signingConfigs.release ───────────────
    // The default Expo template puts "signingConfig signingConfigs.debug" in release
    // right before the shrinkResources line:
    const releaseBuildTypeTarget =
      '            signingConfig signingConfigs.debug\n' +
      '            def enableShrinkResources';

    const releaseBuildTypeFixed =
      '            signingConfig signingConfigs.release\n' +
      '            def enableShrinkResources';

    if (contents.includes(releaseBuildTypeTarget)) {
      contents = contents.replace(releaseBuildTypeTarget, releaseBuildTypeFixed);
    } else {
      console.warn('[withAndroidSigning] Could not find release signingConfig line — not changed');
    }

    config.modResults.contents = contents;
    return config;
  });
};
