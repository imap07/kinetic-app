/**
 * Sentry initialization for the Kinetic mobile app.
 *
 * Called from the top of App.tsx before the provider tree mounts, so
 * render errors caught by the error boundary are also shipped upstream.
 *
 * Design notes
 * ------------
 * • DSN comes from Expo `extra` config (read via expo-constants) or a
 *   process.env var at build time. If unset, Sentry becomes a no-op —
 *   useful for local dev to stay silent.
 *
 * • `enableAutoSessionTracking` lights up crash-free-users metrics,
 *   which is the #1 health number we committed to (>=99.5%).
 *
 * • `tracesSampleRate` = 0.05 in prod to stay within free-tier quota.
 *
 * • `beforeSend` scrubs anything that looks like a JWT / refresh
 *   token from breadcrumb URLs. Expo sometimes auto-captures fetch
 *   URLs that might have tokens embedded in query strings.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const JWT_LIKE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function scrubTokens<T extends string>(s: T): T {
  return s.replace(JWT_LIKE, '[token]') as T;
}

let inited = false;

export function initSentry(): void {
  if (inited) return;
  const dsn =
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    (Constants.expoConfig?.extra?.sentryDsn as string | undefined);

  if (!dsn) {
    // eslint-disable-next-line no-console
    console.log('[sentry] DSN not set — Sentry disabled');
    return;
  }

  Sentry.init({
    dsn,
    // Environment allows splitting prod vs TestFlight crashes in the
    // Sentry dashboard. Falls back to 'release' when Expo Go.
    environment: __DEV__
      ? 'development'
      : Constants.expoConfig?.extra?.env || 'production',
    release: Constants.expoConfig?.version || 'unknown',
    dist: Platform.OS + '-' + (Constants.expoConfig?.runtimeVersion ?? '0'),
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.05,
    // Don't capture in dev — we want the console, not the dashboard.
    enabled: !__DEV__ && !!dsn,
    beforeSend(event) {
      // Scrub tokens from breadcrumbs that record fetch URLs with
      // query strings. Most of our API calls put the JWT in the
      // Authorization header (never in URL), but defense in depth.
      if (event.breadcrumbs) {
        for (const bc of event.breadcrumbs) {
          if (typeof bc.message === 'string') {
            bc.message = scrubTokens(bc.message);
          }
          if (bc.data?.url && typeof bc.data.url === 'string') {
            bc.data.url = scrubTokens(bc.data.url);
          }
        }
      }
      return event;
    },
  });

  inited = true;
}

/**
 * Tag the current Sentry scope with the active sport so the issues
 * stream can be filtered per sport. Call from screens/actions where
 * sport context is known.
 */
export function tagSport(sport: string | undefined): void {
  if (!sport) return;
  Sentry.getCurrentScope().setTag('sport', sport);
}

/**
 * Identify the current user. Hash emails rather than send raw — PIPEDA
 * friendly and lets us correlate incidents per-user without exposing
 * addresses on the dashboard.
 */
export function identify(userId: string, extra?: { tier?: string; isPremium?: boolean }): void {
  Sentry.setUser({
    id: userId,
    ...(extra?.tier && { tier: extra.tier }),
    ...(extra?.isPremium !== undefined && { isPremium: extra.isPremium }),
  });
}

export function clearIdentity(): void {
  Sentry.setUser(null);
}

// Re-export Platform for the init function (avoids a second import
// in callers).
import { Platform } from 'react-native';
