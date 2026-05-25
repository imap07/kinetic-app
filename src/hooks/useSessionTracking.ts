/**
 * Session + app-lifecycle telemetry.
 *
 * Mounts inside AppNavigator (which lives below the AuthProvider so we
 * have `isAuthenticated`). Emits:
 *
 *  • `session_started`     — once per JS runtime (cold launch / reload).
 *                             Carries `daysSinceInstall` so retention
 *                             dashboards can build D1/D7/D30 cohorts
 *                             without joining against the User table.
 *  • `app_foregrounded`    — every transition from background → active,
 *                             with `secondsAwayFromApp` (null on the
 *                             cold launch firing).
 *  • `app_backgrounded`    — every transition active → background/inactive,
 *                             with `sessionDurationSec` measured from
 *                             the matching foreground.
 *
 * Why these and not the Firebase built-in `app_open`: Firebase counts
 * an app_open every brief notification-shade pull-down on iOS, which
 * inflates session counts by 2-3x. By gating on real AppState
 * transitions we get a clean count that matches what users perceive
 * as "opened the app".
 *
 * The install date lives in AsyncStorage under INSTALL_DATE_KEY. First
 * access seeds it to "now"; subsequent launches read it. AsyncStorage
 * is wiped on app reinstall so daysSinceInstall correctly resets for
 * users who delete and re-add the app.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from '../services/analytics';

const INSTALL_DATE_KEY = 'kinetic.installDate';

async function getDaysSinceInstall(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(INSTALL_DATE_KEY);
    const now = Date.now();
    if (!raw) {
      await AsyncStorage.setItem(INSTALL_DATE_KEY, String(now));
      return 0;
    }
    const installed = Number(raw);
    if (!Number.isFinite(installed) || installed <= 0) return 0;
    return Math.max(0, Math.floor((now - installed) / 86_400_000));
  } catch {
    return 0;
  }
}

export function useSessionTracking(isAuthenticated: boolean): void {
  // Track when this JS runtime began — used to detect "fresh launch"
  // vs "returning from background" on the very first AppState change.
  const launchedAtRef = useRef<number>(Date.now());
  // Last timestamp the app entered foreground (set on cold-launch +
  // every active transition). Subtract from background time to get
  // the session duration.
  const lastForegroundAtRef = useRef<number>(Date.now());
  // Last timestamp the app went to background. Subtract from active
  // time to get the "seconds away from app" gap.
  const lastBackgroundAtRef = useRef<number | null>(null);
  // Idempotency guard for session_started — emit once per mount, not
  // once per auth state flip.
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    (async () => {
      const days = await getDaysSinceInstall();
      track({ event: 'session_started', daysSinceInstall: days }).catch(() => {});
    })();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      const now = Date.now();
      if (state === 'active') {
        // Foreground transition. If we have a previous background
        // timestamp, the gap is the time away from the app. On the
        // very first 'active' fire we've never been backgrounded yet,
        // so secondsAwayFromApp is null (cold launch).
        const away =
          lastBackgroundAtRef.current != null
            ? Math.round((now - lastBackgroundAtRef.current) / 1000)
            : null;
        lastForegroundAtRef.current = now;
        lastBackgroundAtRef.current = null;
        track({ event: 'app_foregrounded', secondsAwayFromApp: away }).catch(() => {});
      } else if (state === 'background' || state === 'inactive') {
        // iOS fires `inactive` on incoming-call style interruptions
        // BEFORE going to `background`. Treat both as "leaving" so
        // we don't double-count duration for a single transition.
        // We dedup by only emitting if we don't already have a
        // background timestamp pending.
        if (lastBackgroundAtRef.current != null) return;
        lastBackgroundAtRef.current = now;
        const duration = Math.round((now - lastForegroundAtRef.current) / 1000);
        track({ event: 'app_backgrounded', sessionDurationSec: duration }).catch(() => {});
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
