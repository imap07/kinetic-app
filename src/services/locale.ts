/**
 * App-locale override.
 *
 * Default behavior: the device locale wins, as resolved in src/i18n/index.ts.
 * If the user picks a language manually in Settings we persist that choice
 * here and i18n re-applies it on every cold start (after the synchronous
 * device-locale init, to avoid a blank flash). Clearing the override
 * restores the device-default behavior.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '../i18n';
import { authApi } from '../api';
import type { BackendLanguage } from '../api/auth';

export const LOCALE_OVERRIDE_KEY = '@kinetic/locale_override';

export type AppLocale = BackendLanguage; // 'en' | 'es' | 'fr' | 'pt'

const SUPPORTED: readonly AppLocale[] = ['en', 'es', 'fr', 'pt'];

function isSupported(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED as readonly string[]).includes(value);
}

/** Read the persisted override. Returns null if the user hasn't picked one. */
export async function getLocaleOverride(): Promise<AppLocale | null> {
  try {
    const v = await AsyncStorage.getItem(LOCALE_OVERRIDE_KEY);
    return isSupported(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the locale that should be active at app boot. Override wins over
 * device locale; unknown values collapse to 'en'.
 */
export async function resolveBootLocale(): Promise<AppLocale> {
  const override = await getLocaleOverride();
  if (override) return override;
  const head = (Localization.getLocales()[0]?.languageCode ?? 'en').toLowerCase();
  return isSupported(head) ? head : 'en';
}

/**
 * Switch the app language at runtime. Persists the choice locally,
 * applies it to i18next immediately, and (when authenticated) tells the
 * backend so transactional emails / push notifications honor it too.
 * Backend sync is best-effort — a failure here doesn't undo the local
 * change, since the user explicitly asked for it.
 */
export async function setAppLocale(locale: AppLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_OVERRIDE_KEY, locale);
  await i18n.changeLanguage(locale);
  try {
    await authApi.setPreferredLanguage(locale);
  } catch {
    // Network / 401 etc. — local change still stands; we'll resync on next
    // settings touch. Not worth surfacing a toast for.
  }
}

/**
 * Clear the override and revert to the device locale immediately.
 * Also notifies the backend with the device locale so server-emitted
 * copy stays aligned.
 */
export async function clearAppLocaleOverride(): Promise<AppLocale> {
  await AsyncStorage.removeItem(LOCALE_OVERRIDE_KEY);
  const head = (Localization.getLocales()[0]?.languageCode ?? 'en').toLowerCase();
  const next: AppLocale = isSupported(head) ? head : 'en';
  await i18n.changeLanguage(next);
  try {
    await authApi.setPreferredLanguage(next);
  } catch {
    // best-effort
  }
  return next;
}
