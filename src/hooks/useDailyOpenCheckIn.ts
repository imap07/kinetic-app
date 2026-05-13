/**
 * Daily app-open check-in.
 *
 * Hits POST /streaks/daily-open-check-in once on mount and again on
 * every app-foreground transition. Backend is idempotent per UTC
 * day, so re-firing on every foreground is cheap and self-healing
 * — if the first call failed due to a transient network blip, the
 * next foreground retries.
 *
 * Coin credits surface automatically via the CoinContext refresh
 * loop's gain detector (a +2 / +50 toast appears with no extra
 * wiring). Streak number itself is exposed via dailyOpenStreak in
 * the returned response if a caller wants to render it.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useCoins } from '../contexts/CoinContext';
import { streaksApi } from '../api/streaks';

export function useDailyOpenCheckIn() {
  const { tokens, isAuthenticated } = useAuth();
  const { refreshBalance } = useCoins();
  // Throttle re-fires within the same JS runtime — even though the
  // backend is idempotent, hitting the network on every brief
  // background blip (notification banner pulled down, etc.) is
  // wasteful. 60s soft cap is plenty given the backend gate is UTC
  // day boundaries.
  const lastFiredRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !tokens?.accessToken) return;

    const fire = async () => {
      const now = Date.now();
      if (now - lastFiredRef.current < 60_000) return;
      lastFiredRef.current = now;
      try {
        const res = await streaksApi.dailyOpenCheckIn(tokens.accessToken);
        // Only bother refreshing the wallet when something was
        // actually credited — same-day re-calls have zero delta.
        if (res.awardedCoins > 0 || res.milestoneCoins > 0) {
          await refreshBalance();
        }
      } catch {
        /* transient — next foreground retries */
      }
    };

    // Initial check-in on mount (after sign-in / app launch).
    fire();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') fire();
    });
    return () => sub.remove();
  }, [isAuthenticated, tokens?.accessToken, refreshBalance]);
}
