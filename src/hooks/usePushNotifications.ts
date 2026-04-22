import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { authApi } from '../api/auth';
import { notificationsApi } from '../api/notifications';
import { navigate } from '../navigation/navigationRef';
import { track } from '../services/analytics';

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

      if (data && typeof data === 'object') {
        const { type } = data as Record<string, unknown>;
        if (typeof type === 'string') {
          track({ event: 'push_opened', type });
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
