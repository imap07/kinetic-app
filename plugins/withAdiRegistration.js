const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Injects the Google Play "Android developer verification" token into
 * android/app/src/main/assets/adi-registration.properties during prebuild.
 *
 * Google Play requires this file when registering a new package name whose
 * signing key is already in use, to prove ownership. The token value is
 * account-specific and shown in the Play Console "Sign and upload an APK"
 * flow.
 *
 * Once the package name is verified, this plugin can be removed.
 */
const ADI_TOKEN = 'CNFZE7H23SPTUAAAAAAAAAAAAA'; // 26 chars — verified from Play Console

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
      );
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const filePath = path.join(assetsDir, 'adi-registration.properties');
      fs.writeFileSync(filePath, ADI_TOKEN, 'utf8');
      return config;
    },
  ]);
};
