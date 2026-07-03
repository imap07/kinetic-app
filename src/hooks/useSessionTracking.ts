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
import { AppState, Linking, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { track } from '../services/analytics';
import { trackAppOpened } from '../utils/analytics';

const INSTALL_DATE_KEY = 'kinetic.installDate';
const LAST_OPEN_KEY = 'kinetic.lastOpenAt';

// ─── Open-source attribution ─────────────────────────────────
//
// What brought the user into the app: a push-notification tap, a deep
// link, or nothing (icon tap / app switcher = organic). Cold launch is
// resolved deterministically below (getLastNotificationResponseAsync +
// getInitialURL run BEFORE session_started emits). Foreground
// transitions are trickier — the push/deeplink callbacks can fire just
// after AppState flips to 'active' — so app_foregrounded emission is
// deferred by a short grace window during which markAppOpenSource()
// can claim the transition.
type OpenSource = 'push' | 'deeplink' | 'organic';
let pendingOpenSource: OpenSource | null = null;

/** Called by usePushNotifications when a notification tap is handled.
 *  Claims the in-flight (or imminent) foreground transition as
 *  push-driven. */
export function markAppOpenSource(source: Exclude<OpenSource, 'organic'>): void {
  pendingOpenSource = source;
}

const FOREGROUND_ATTRIBUTION_GRACE_MS = 700;

async function resolveColdLaunchSource(): Promise<OpenSource> {
  try {
    const notifResponse = await Notifications.getLastNotificationResponseAsync();
    if (notifResponse) return 'push';
  } catch {
    /* expo-notifications unavailable (Expo Go / simulator edge) */
  }
  try {
    const url = await Linking.getInitialURL();
    if (url) return 'deeplink';
  } catch {
    /* ignore */
  }
  return 'organic';
}

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

/**
 * Reads the previous app-open timestamp and refreshes it to `now`.
 * Returns the day-delta and whether the user is returning (i.e. had
 * a previous open recorded). First-ever open returns
 * { daysSinceLastOpen: 0, isReturningUser: false }.
 */
async function rotateLastOpen(): Promise<{
  daysSinceLastOpen: number;
  isReturningUser: boolean;
}> {
  try {
    const raw = await AsyncStorage.getItem(LAST_OPEN_KEY);
    const now = Date.now();
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(now));
    if (!raw) return { daysSinceLastOpen: 0, isReturningUser: false };
    const prev = Number(raw);
    if (!Number.isFinite(prev) || prev <= 0) {
      return { daysSinceLastOpen: 0, isReturningUser: false };
    }
    const days = Math.max(0, Math.floor((now - prev) / 86_400_000));
    return { daysSinceLastOpen: days, isReturningUser: true };
  } catch {
    return { daysSinceLastOpen: 0, isReturningUser: false };
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
      const openSource = await resolveColdLaunchSource();
      track({ event: 'session_started', daysSinceInstall: days, openSource }).catch(() => {});
      // GA4 retention event — separate from session_started so dashboards
      // can build day-of-return cohorts without re-deriving from the
      // install date. Fires once per cold launch.
      const last = await rotateLastOpen();
      trackAppOpened(last);
    })();

    // Deep links arriving while the app is alive (universal links,
    // kineticapp.ca/r/* and /join/*) claim the foreground transition.
    const linkSub = Linking.addEventListener('url', () => {
      pendingOpenSource = 'deeplink';
    });

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
        // Deferred so a push-tap / deep-link handler racing this
        // AppState callback can still claim the transition via
        // markAppOpenSource() (see the attribution note up top).
        setTimeout(() => {
          const openSource = pendingOpenSource ?? 'organic';
          pendingOpenSource = null;
          track({ event: 'app_foregrounded', secondsAwayFromApp: away, openSource }).catch(
            () => {},
          );
        }, FOREGROUND_ATTRIBUTION_GRACE_MS);
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
    return () => {
      sub.remove();
      linkSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
