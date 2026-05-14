// Minimal cold-start instrumentation. Captures the time from
// JS execution start to the first interactive render so we can spot
// regressions across releases without depending on Sentry's mobile
// vitals (which aren't enabled on this account tier yet).
//
// The "boot" timestamp is the first thing `App.tsx` imports, and
// `markReady()` fires inside `AppNavigator` once the root navigator
// has mounted (i.e. user can actually interact). The delta is logged
// to console (visible in `npx expo start` and adb logcat) and as a
// Sentry breadcrumb so production cold-start times are visible after
// the user reports a slow open.

import * as Sentry from '@sentry/react-native';

const BOOT_MS = Date.now();
let readyLogged = false;

export function markReady(label: string = 'app-ready'): void {
  if (readyLogged) return;
  readyLogged = true;
  const delta = Date.now() - BOOT_MS;
  // eslint-disable-next-line no-console
  console.log(`[perf] ${label} in ${delta}ms`);
  try {
    Sentry.addBreadcrumb({
      category: 'perf',
      level: 'info',
      message: `cold-start ${label}=${delta}ms`,
    });
  } catch {
    // Sentry may not be initialized in test/dev — never throw from perf.
  }
}

export function getBootElapsedMs(): number {
  return Date.now() - BOOT_MS;
}
