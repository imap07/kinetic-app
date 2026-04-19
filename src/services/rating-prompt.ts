/**
 * Rating-prompt trigger.
 *
 * Apple and Google both strongly prefer that the rate-the-app prompt
 * fires at a "moment of delight" — not on first launch, not on
 * crashes, not during onboarding. We pick it after a user's 3rd WON
 * pick: they just had a positive outcome and their dopamine is at a
 * peak, which is when reviews come in positive.
 *
 * Constraints baked in (iOS requires these anyway):
 *   - Ask at most 3 times per 365 days (iOS enforces; we also gate).
 *   - Never ask within 7 days of last ask.
 *   - Only ask if StoreReview.isAvailableAsync() is true (covers Expo
 *     Go + devices without store access).
 *   - Debounce: if the user has "won streak" from a single game we
 *     don't spam them — we count lifetime wins, not session wins.
 *
 * Usage
 * -----
 * Call `maybeRequestRating({ lifetimeWins })` whenever a pick resolves
 * as WON (from the SSE update handler or the picks-list refresh).
 * The function internally checks the AsyncStorage guardrails and
 * calls StoreReview.requestReview() only when appropriate. Safe to
 * call on every resolution — it's cheap.
 */
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ASKED_KEY = 'kinetic.rating.lastAskedAt';
const TIMES_ASKED_KEY = 'kinetic.rating.timesAsked';
// Ask after the user crosses these win milestones (lifetime).
const WIN_TRIGGERS = [3, 15, 50];

export async function maybeRequestRating(opts: { lifetimeWins: number }): Promise<void> {
  // Guardrail 1: only at the specified milestones. Eliminates the
  // "ask every time" footgun if this is called from a noisy callsite.
  if (!WIN_TRIGGERS.includes(opts.lifetimeWins)) return;

  // Guardrail 2: platform availability.
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
  } catch {
    return;
  }

  // Guardrail 3: cooldown. We track last-asked timestamp + count to
  // avoid asking again within 7 days or more than 3 times per year.
  try {
    const [lastAskedRaw, timesAskedRaw] = await Promise.all([
      AsyncStorage.getItem(LAST_ASKED_KEY),
      AsyncStorage.getItem(TIMES_ASKED_KEY),
    ]);
    const lastAsked = lastAskedRaw ? parseInt(lastAskedRaw, 10) : 0;
    const timesAsked = timesAskedRaw ? parseInt(timesAskedRaw, 10) : 0;
    const now = Date.now();

    const daysSinceLast = lastAsked ? (now - lastAsked) / (1000 * 60 * 60 * 24) : Infinity;
    if (daysSinceLast < 7) return;
    if (timesAsked >= 3 && daysSinceLast < 365) return;

    await StoreReview.requestReview();

    await AsyncStorage.multiSet([
      [LAST_ASKED_KEY, String(now)],
      [TIMES_ASKED_KEY, String(timesAsked + 1)],
    ]);
  } catch {
    // AsyncStorage / StoreReview failures — never throw into the caller.
  }
}
