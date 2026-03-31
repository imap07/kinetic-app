/**
 * Expo config plugin to add use_modular_headers! to the Podfile.
 *
 * Required for @react-native-firebase with Firebase iOS SDK 11+
 * which uses Swift pods (FirebaseCoreInternal) that depend on
 * GoogleUtilities — GoogleUtilities needs modular headers enabled
 * to generate module maps when built as static libraries.
 *
 * NOTE: Do NOT combine with use_frameworks! — that causes
 * "non-modular header inside framework module" compile errors
 * because React Native headers aren't modular.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile',
      );
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Only add if not already present
      if (!podfile.includes('use_modular_headers!')) {
        // Insert before the first `platform :ios` line
        podfile = podfile.replace(
          /^(platform :ios)/m,
          'use_modular_headers!\n$1',
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return cfg;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
