/**
 * Canonical domain constants — SINGLE SOURCE OF TRUTH.
 *
 * This file is the authoritative copy. A byte-identical mirror lives in
 * `kinetic-app/src/shared/domain.ts`; the CI job `validate-shared` fails
 * if they drift. Any change to sport lists, tier thresholds, or
 * prediction-type enums MUST land here first and then be synced with:
 *
 *   scripts/sync-shared.sh
 *
 * Why this exists
 * ---------------
 * We had three production bugs rooted in frontend/backend copies
 * disagreeing:
 *   - NO_DRAW_SPORTS missing `hockey` in one side → hockey Draw tab
 *     appeared in UI but the resolver fallback silently converted to
 *     HOME win. "Draw trap" on the user.
 *   - Tier thresholds 3–10× higher in frontend → progress bar showed
 *     wrong tier for weeks.
 *   - OVER_UNDER_THRESHOLDS could diverge → bad client sends threshold
 *     backend rejects.
 *
 * Every symbol that influences BOTH resolution logic AND UI belongs
 * here. Visual-only tokens (spacing, radii) stay in each app's theme.
 */

// ─── Sport keys ────────────────────────────────────────────────────
// Keep this order stable — UI tab ordering depends on it.
export const SPORT_KEYS = [
  'football',
  'basketball',
  'hockey',
  'american-football',
  'baseball',
  'formula-1',
  'afl',
  'handball',
  'rugby',
  'volleyball',
  'mma',
] as const;

export type SportKey = typeof SPORT_KEYS[number];

// Free-tier sport (used as fallback when user.favoriteSports is empty).
export const FREE_SPORT: SportKey = 'football';

// ─── Draw eligibility ──────────────────────────────────────────────
// Sports whose matches effectively always produce a winner. A score
// that comes in as a tie (rare — usually API data glitch or a league
// without overtime) is resolved in favor of HOME rather than creating
// a fake DRAW outcome. The UI also uses this list to hide the Draw
// button on the winner selector and the "Draws" row in H2H panels.
export const NO_DRAW_SPORTS: readonly SportKey[] = [
  'basketball',
  'baseball',
  'american-football',
  'formula-1',
  'mma',
  'volleyball',
  'afl',
  'hockey',
] as const;

export function isDrawEligible(sport: string): boolean {
  return !NO_DRAW_SPORTS.includes(sport as SportKey);
}

// ─── BTTS (Both Teams To Score) ────────────────────────────────────
// Only sports where both teams can plausibly fail to score. Not
// applicable to: basketball/baseball/football/volleyball/afl/mma/F1
// (at least one side almost always scores or scoring doesn't apply).
export const BTTS_ALLOWED_SPORTS: readonly SportKey[] = [
  'football',
  'hockey',
  'handball',
  'rugby',
] as const;

export const BTTS_BLOCKED_SPORTS: readonly SportKey[] = [
  'basketball',
  'baseball',
  'american-football',
  'volleyball',
  'afl',
  'formula-1',
  'mma',
] as const;

// ─── Over/Under thresholds ─────────────────────────────────────────
// Per-sport list of valid thresholds the book offers. Backend rejects
// any threshold not in this list at create time.
export const OVER_UNDER_THRESHOLDS: Record<SportKey, number[]> = {
  football: [0.5, 1.5, 2.5, 3.5, 4.5],
  basketball: [180.5, 190.5, 200.5, 210.5, 220.5, 230.5],
  hockey: [4.5, 5.5, 6.5],
  'american-football': [40.5, 45.5, 50.5, 55.5],
  baseball: [6.5, 7.5, 8.5, 9.5],
  handball: [40.5, 45.5, 50.5, 55.5],
  rugby: [30.5, 35.5, 40.5, 45.5, 50.5],
  volleyball: [150.5, 160.5, 170.5, 180.5],
  afl: [140.5, 150.5, 160.5, 170.5, 180.5],
  'formula-1': [15.5, 16.5, 17.5, 18.5],
  mma: [1.5, 2.5],
};

// ─── Prediction types ──────────────────────────────────────────────
// Literal union covering every value that can flow through the
// /predictions endpoint. Backend enums map 1:1 — this is the shape
// the wire format uses.
export const PREDICTION_TYPES = [
  'result',
  'exact_score',
  'over_under',
  'btts',
  'fastest_lap',
  'podium_finish',
  'method_of_victory',
  'goes_the_distance',
] as const;

export type PredictionType = typeof PREDICTION_TYPES[number];

// Prediction types that are ONLY valid for a specific sport. Used by
// the create-prediction validator in predictions.service.ts to reject
// out-of-domain payloads.
export const SPORT_EXCLUSIVE_PREDICTION_TYPES: Record<PredictionType, SportKey | null> = {
  result: null,
  exact_score: 'football',
  over_under: null,
  btts: null,
  fastest_lap: 'formula-1',
  podium_finish: 'formula-1',
  method_of_victory: 'mma',
  goes_the_distance: 'mma',
};

// ─── Tier ladder ────────────────────────────────────────────────────
// Points thresholds for user tier promotion. Used by both the backend
// `updateTier()` function and the frontend progress bar — if these
// don't match, users see the wrong "progress to next tier" value.
export interface TierEntry {
  key: 'rookie' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';
  label: string;
  /** Inclusive minimum points to be in this tier. */
  minPoints: number;
  /** Next tier up, or null for the cap. */
  next: TierEntry['key'] | null;
}

export const TIER_LADDER: TierEntry[] = [
  { key: 'rookie',  label: 'Rookie',  minPoints: 0,     next: 'bronze'  },
  { key: 'bronze',  label: 'Bronze',  minPoints: 300,   next: 'silver'  },
  { key: 'silver',  label: 'Silver',  minPoints: 1000,  next: 'gold'    },
  { key: 'gold',    label: 'Gold',    minPoints: 2000,  next: 'diamond' },
  { key: 'diamond', label: 'Diamond', minPoints: 5000,  next: 'legend'  },
  { key: 'legend',  label: 'Legend',  minPoints: 10000, next: null      },
];

export function tierForPoints(points: number): TierEntry {
  // Walk from the top so the highest matching threshold wins.
  for (let i = TIER_LADDER.length - 1; i >= 0; i--) {
    if (points >= TIER_LADDER[i].minPoints) return TIER_LADDER[i];
  }
  return TIER_LADDER[0];
}

// ─── Analytics event names ─────────────────────────────────────────
// The 18-event schema from the product-analytics plan. Exported as a
// union type so misspelled event names fail at compile time in both
// repos. Emission goes through a `track(event, props)` helper that
// validates the props shape against the contract below.
export const ANALYTICS_EVENTS = [
  // Onboarding funnel
  'onboarding_started',
  'onboarding_sport_selected',
  'onboarding_teams_selected',
  'onboarding_completed',
  // Activation funnel
  'pick_screen_opened',
  'pick_submitted',
  'pick_resolved',
  // Retention
  'session_started',
  'streak_extended',
  'streak_broken',
  'achievement_unlocked',
  // Monetization
  'paywall_shown',
  'paywall_converted',
  'coin_purchase',
  'league_joined_paid',
  // Growth
  'share_generated',
  'referral_invited',
  'referral_converted',
  // Ads
  'rewarded_ad_completed',
] as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[number];

// ─── Pick reactions ────────────────────────────────────────────────
// Four-emoji reaction set shown on other members' picks inside a
// league detail view. Kept intentionally tiny: emoji-only social is
// spam-resistant and requires no content moderation (vs. free-text
// chat which would trigger Apple 1.2 UGC requirements). If you add a
// 5th reaction, update the Zod validator in reactions.service.ts and
// the mobile bottom sheet in LeagueDetailScreen.
export const PICK_REACTIONS = ['fire', 'skull', 'crown', 'target'] as const;
export type PickReactionKey = typeof PICK_REACTIONS[number];

// Emoji glyph mapping kept here so both ends render the exact same
// character (iOS/Android emoji fonts differ subtly). Never read the
// glyph from an i18n bundle — emoji fonts aren't translated.
export const PICK_REACTION_GLYPHS: Record<PickReactionKey, string> = {
  fire: '🔥',
  skull: '💀',
  crown: '👑',
  target: '🎯',
};
