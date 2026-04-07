import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../api/config';
import type { SportGame, SportKey } from '../api/sports';

interface LiveSSEData {
  liveGames: SportGame[];
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
 * Works for all 11 sports. Backend pushes every 15s from MongoDB cache.
 * Cost: 0 API-Sports requests from the client.
 * Falls back to polling if SSE is not available (older devices, network issues).
 */
export function useLiveSSE({ sport, token, enabled = true }: UseLiveSSEOptions) {
  const [liveGames, setLiveGames] = useState<SportGame[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_DELAY = 30_000; // 30s max

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const url = `${API_BASE_URL}/sports/live/stream?sport=${sport}&token=${token}`;
      const es = new EventSource(url);

      es.addEventListener('live-update', (event: any) => {
        try {
          const data: LiveSSEData = JSON.parse(event.data);
          setLiveGames(data.liveGames || []);
          setLastUpdate(data.updatedAt);
          setError(null);
          reconnectAttempts.current = 0;
        } catch (parseErr) {
          console.warn('[useLiveSSE] Failed to parse event:', parseErr);
        }
      });

      es.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log(`[useLiveSSE] Connected — sport: ${sport}`);
      };

      es.onerror = () => {
        setConnected(false);
        es.close();

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), MAX_RECONNECT_DELAY);
        reconnectAttempts.current++;
        console.log(`[useLiveSSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      eventSourceRef.current = es;
    } catch {
      setError('SSE not supported');
      console.warn('[useLiveSSE] EventSource not available, fallback to polling');
    }
  }, [sport, token, enabled]);

  useEffect(() => {
    if (!enabled || !token) return;

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        connect();
      } else {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          setConnected(false);
        }
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      }
    };

    connect();

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      subscription.remove();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect, enabled, token]);

  return {
    liveGames,
    lastUpdate,
    connected,
    error,
    reconnect: connect,
  };
}
