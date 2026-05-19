import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';

// Synchronous init with the device locale so the first render never sees
// untranslated keys. If the user previously picked an override in
// Settings, the async block below swaps it in moments later — fast
// enough that no real screen renders English-by-mistake before the
// switch lands.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    pt: { translation: pt },
  },
  lng: ['es', 'fr', 'pt'].includes(deviceLocale) ? deviceLocale : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// User-picked override (set via Settings → Language). Kept in lockstep
// with `LOCALE_OVERRIDE_KEY` in src/services/locale.ts. Async-loaded so
// init stays synchronous — the trade-off is a sub-frame flash of the
// device locale before the override applies, which the user won't see
// because nothing renders that fast on cold start.
(async () => {
  try {
    const override = await AsyncStorage.getItem('@kinetic/locale_override');
    if (override && ['en', 'es', 'fr', 'pt'].includes(override) && override !== i18n.language) {
      await i18n.changeLanguage(override);
    }
  } catch {
    // AsyncStorage errors here aren't worth crashing the boot path for —
    // we'll just stay on the device locale.
  }
})();

export default i18n;
