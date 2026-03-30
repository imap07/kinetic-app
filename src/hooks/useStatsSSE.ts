import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../api/config';
import type { DailyStatusResponse, MyStatsResponse } from '../api/predictions';

interface StatsSSEData {
  stats: MyStatsResponse;
  daily: DailyStatusResponse;
}

interface UseStatsSSEOptions {
  token: string | null;
  enabled?: boolean;
  onUpdate: (data: StatsSSEData) => void;
}

/**
 * useStatsSSE — SSE hook for real-time user prediction stats.
 * Listens on GET /api/predictions/stats-stream and fires onUpdate
 * whenever the backend pushes fresh stats (after create/delete/resolve).
 */
export function useStatsSSE({ token, enabled = true, onUpdate }: UseStatsSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const MAX_RECONNECT_DELAY = 30_000;

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const url = `${API_BASE_URL}/predictions/stats-stream?token=${token}`;
      const es = new EventSource(url);

      es.addEventListener('stats-update', (event: any) => {
        try {
          const data: StatsSSEData = JSON.parse(event.data);
          onUpdateRef.current(data);
          reconnectAttempts.current = 0;
        } catch (parseErr) {
          console.warn('[useStatsSSE] Failed to parse event:', parseErr);
        }
      });

      es.onopen = () => {
        reconnectAttempts.current = 0;
        console.log('[useStatsSSE] Connected');
      };

      es.onerror = () => {
        es.close();
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          MAX_RECONNECT_DELAY,
        );
        reconnectAttempts.current++;
        console.log(`[useStatsSSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      eventSourceRef.current = es;
    } catch {
      console.warn('[useStatsSSE] EventSource not available');
    }
  }, [token, enabled]);

  useEffect(() => {
    if (!enabled || !token) return;

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        connect();
      } else {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      }
    };

    connect();
    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      subscription.remove();
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect, enabled, token]);
}
