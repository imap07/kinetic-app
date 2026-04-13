import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../api/config';

const PING_INTERVAL = 15_000; // 15 seconds
const PING_TIMEOUT = 5_000; // 5 seconds

/**
 * useNetworkStatus — lightweight connectivity hook.
 *
 * Pings the backend health endpoint periodically and on app foreground
 * to determine whether the device has a working internet connection.
 * Uses plain `fetch` so no extra native dependency is needed.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);
        // Use a lightweight HEAD request to avoid downloading response body
        await fetch(`${API_BASE_URL}/health`, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (mounted) setIsOnline(true);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    // Initial check
    checkConnection();

    // Periodic polling
    intervalRef.current = setInterval(checkConnection, PING_INTERVAL);

    // Re-check when app comes to foreground
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        checkConnection();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);

  return isOnline;
}
