import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { authApi } from '../api/auth';
import { notificationsApi } from '../api/notifications';
import { navigate } from '../navigation/navigationRef';
import { track } from '../services/analytics';
import { trackNotificationTapped } from '../utils/analytics';
import { markAppOpenSource } from './useSessionTracking';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * All console output in this file is gated behind `__DEV__` so release
 * builds don't leak push-token registration status / permission state
 * into logcat or the iOS device console. Those messages would otherwise
 * give an on-device attacker a rough map of our push flow.
 */
function devLog(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

/**
 * Module-level cache of the currently-registered Expo push token. Set by
 * the hook after a successful `registerPushToken` API call and cleared
 * after `removeRegisteredPushToken`. Exposed so AuthContext.logout can
 * read it without prop-drilling through React tree.
 *
 * Why a module global instead of a context: the push token is a single
 * per-install value (Expo issues one per app install), so there's no
 * meaningful per-component state. AuthContext is one of many readers,
 * and a module ref avoids creating a circular dep with NotificationContext.
 */
let cachedPushToken: string | null = null;

/** Read the last-registered push token, or null if registration never
 *  completed for this app launch. */
export function getCachedPushToken(): string | null {
  return cachedPushToken;
}

/**
 * Unregister the cached push token from the backend, then clear the
 * cache. No-op if no token is registered. Safe to call repeatedly.
 * Used by AuthContext.logout so the next user on this device doesn't
 * receive notifications meant for the previous one.
 */
export async function removeRegisteredPushToken(authToken: string): Promise<void> {
  const t = cachedPushToken;
  if (!t) return;
  try {
    await authApi.removePushToken(t, authToken);
  } catch (err) {
    devLog('Failed to remove push token from backend:', err);
    // Don't rethrow — logout must continue even if the backend call
    // fails. Worst case: stale token gets garbage-collected when the
    // next user's expoPushTokens array is set, or when Expo retires it.
  } finally {
    cachedPushToken = null;
  }
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    devLog('Push notifications require a physical device');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kinetic',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C6FF00',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    devLog('Push notification permission not granted');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (err) {
    devLog('Failed to get Expo push token:', err);
    return null;
  }
}

export function usePushNotifications(authToken: string | null | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!authToken || registeredRef.current) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      setExpoPushToken(token);

      try {
        await authApi.registerPushToken(token, authToken);
        registeredRef.current = true;
        cachedPushToken = token;
        devLog('Push token registered with backend');
      } catch (err) {
        devLog('Failed to register push token with backend:', err);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((n) => {
      setNotification(n);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      devLog('Notification tapped:', data);
      // Attribute the in-flight foreground transition to this push tap
      // (session/foreground events defer briefly to allow this claim).
      markAppOpenSource('push');

      if (data && typeof data === 'object') {
        const { type } = data as Record<string, unknown>;
        if (typeof type === 'string') {
          track({ event: 'push_opened', type });
          // GA4 funnel mirror of push_opened — distinct event name so
          // GA4 dashboards (which can't ingest the legacy `push_opened`
          // schema retroactively) can build "open → action" funnels
          // from a clean event family.
          trackNotificationTapped(type);
          if (authToken && /^[a-z_]{1,40}$/.test(type)) {
            notificationsApi.trackOpen(type, authToken).catch(() => {});
          }
        }
        switch (type) {
          case 'league':
            if (data.leagueId) {
              navigate('Main', {
                screen: 'Leagues',
                params: { screen: 'CoinLeagueDetail', params: { leagueId: String(data.leagueId) } },
              } as any);
            }
            break;
          case 'prediction':
            navigate('Main', { screen: 'MyPicks' } as any);
            break;
          case 'match':
            if (data.fixtureApiId) {
              navigate('Main', {
                screen: 'Home',
                params: { screen: 'MatchPrediction', params: { fixtureApiId: Number(data.fixtureApiId), sport: data.sport as string | undefined } },
              } as any);
            }
            break;
          default:
            break;
        }
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [authToken]);

  return { expoPushToken, notification };
}
