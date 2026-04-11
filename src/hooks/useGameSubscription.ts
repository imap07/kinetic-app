import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi, SubscribeGameParams } from '../api/notifications';

interface UseGameSubscriptionOptions {
  token: string | null | undefined;
  sport: string;
  gameApiId: number;
  homeTeamName: string;
  awayTeamName: string;
  leagueName?: string;
}

interface UseGameSubscriptionResult {
  isSubscribed: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
}

/**
 * Manage a user's "Follow match" subscription for a specific game.
 *
 * - On mount, checks the current subscription status from the API.
 * - `toggle()` performs an optimistic update immediately so the UI snaps
 *   to the new state without waiting for the network round-trip. If the
 *   API call fails, the state is rolled back.
 * - Safe to mount on screens that render before the user is authenticated
 *   (token === null) — silently no-ops in that case.
 */
export function useGameSubscription({
  token,
  sport,
  gameApiId,
  homeTeamName,
  awayTeamName,
  leagueName,
}: UseGameSubscriptionOptions): UseGameSubscriptionResult {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !gameApiId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    notificationsApi
      .getGameSubscriptionStatus(token, gameApiId)
      .then((res) => {
        if (!cancelled && isMounted.current) {
          setIsSubscribed(res?.subscribed ?? false);
        }
      })
      .catch(() => {
        // network failure — default to not subscribed, user can retry
      })
      .finally(() => {
        if (!cancelled && isMounted.current) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, gameApiId]);

  const toggle = useCallback(async () => {
    if (!token) return;

    const wasSubscribed = isSubscribed;
    // Optimistic update
    setIsSubscribed(!wasSubscribed);

    try {
      if (wasSubscribed) {
        await notificationsApi.unsubscribeFromGame(token, gameApiId);
      } else {
        await notificationsApi.subscribeToGame(token, {
          sport,
          gameApiId,
          homeTeamName,
          awayTeamName,
          leagueName,
        } as SubscribeGameParams);
      }
    } catch {
      // Roll back on failure
      if (isMounted.current) {
        setIsSubscribed(wasSubscribed);
      }
    }
  }, [token, isSubscribed, sport, gameApiId, homeTeamName, awayTeamName, leagueName]);

  return { isSubscribed, loading, toggle };
}
