import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../api/config';
import type { SportGame, SportKey } from '../api/sports';

interface LiveSSEData {
  liveMatches: SportGame[];
  updatedAt: string;
}

interface UseLiveSSEOptions {
  sport: SportKey;
  token: string | null;
  enabled?: boolean;
}

/**
 * useLiveSSE — Server-Sent Events hook for real-time live scores
 * ───────────────────────────────────────────────────────────────
 * Replaces setInterval polling with server push.
 * Falls back to polling if SSE is not available (older devices, network issues).
 *
 * Cost: 0 API-Sports requests from the client. Backend pushes from MongoDB cache.
 */
export function useLiveSSE({ sport, token, enabled = true }: UseLiveSSEOptions) {
  const [liveMatches, setLiveMatches] = useState<SportGame[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_DELAY = 30_000; // 30s max delay between retries

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    // Clean up previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const url = `${API_BASE_URL}/sports/live/stream?sport=${sport}&token=${token}`;
      const es = new EventSource(url);

      es.addEventListener('live-update', (event: any) => {
        try {
          const data: LiveSSEData = JSON.parse(event.data);
          setLiveMatches(data.liveMatches || []);
          setLastUpdate(data.updatedAt);
          setError(null);
          reconnectAttempts.current = 0; // Reset on successful message
        } catch (parseErr) {
          console.warn('[useLiveSSE] Failed to parse event:', parseErr);
        }
      });

      es.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log('[useLiveSSE] Connected to live stream');
      };

      es.onerror = () => {
        setConnected(false);
        es.close();

        // Exponential backoff reconnect
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          MAX_RECONNECT_DELAY,
        );
        reconnectAttempts.current++;

        console.log(`[useLiveSSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      eventSourceRef.current = es;
    } catch (err) {
      // EventSource not supported — set error so the screen can fallback to polling
      setError('SSE not supported');
      console.warn('[useLiveSSE] EventSource not available, fallback to polling');
    }
  }, [sport, token, enabled]);

  // Connect/disconnect based on app state
  useEffect(() => {
    if (!enabled || !token) return;

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        connect();
      } else {
        // Disconnect when app goes to background to save battery
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          setConnected(false);
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      }
    };

    // Initial connect
    connect();

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      subscription.remove();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, enabled, token]);

  return {
    liveMatches,
    lastUpdate,
    connected,
    error, // If error is set, the screen should fallback to polling
    reconnect: connect,
  };
}
