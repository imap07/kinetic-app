/**
 * Analytics event contract.
 *
 * The 18 events declared in ANALYTICS_EVENTS (src/shared/domain.ts)
 * get their typed prop shapes here. Both frontend and backend import
 * from this file when emitting — misspelled keys fail at compile
 * time, and every event carries a documented payload so dashboards
 * aren't built on guesswork.
 *
 * Why here rather than per-event files
 * -------------------------------------
 * Events are thin. Fragmenting them across 18 files would double the
 * import cost with zero safety gain; a single tagged-union type
 * fits on one page and stays readable.
 *
 * PII policy
 * ----------
 * Never include:
 *   - raw email / displayName (userId only, server-hashed downstream)
 *   - device identifiers
 *   - free-form user text
 * Sport keys, sport-agnostic counts, and monetary amounts are fine.
 */
import { AnalyticsEvent, SportKey, PredictionType } from './domain';

export type AnalyticsProps =
  // ─── Onboarding funnel ────────────────────────────────────
  | { event: 'onboarding_started'; source?: string }
  | { event: 'onboarding_sport_selected'; sports: SportKey[] }
  | { event: 'onboarding_teams_selected'; count: number; sports: SportKey[] }
  | {
      event: 'onboarding_completed';
      durationSec: number;
      sportsCount: number;
      teamsCount: number;
    }
  // ─── Activation funnel ────────────────────────────────────
  | {
      event: 'pick_screen_opened';
      sport: SportKey;
      gameApiId: number;
      source: 'dashboard' | 'deeplink' | 'notification' | 'search' | 'league';
    }
  | {
      event: 'pick_submitted';
      sport: SportKey;
      predictionType: PredictionType;
      oddsMultiplier: number;
      isFirstPick: boolean;
    }
  | {
      event: 'pick_resolved';
      sport: SportKey;
      predictionType: PredictionType;
      won: boolean;
      points: number;
      hoursToResolve: number;
    }
  // ─── Retention ────────────────────────────────────────────
  | { event: 'session_started'; daysSinceInstall: number }
  | { event: 'streak_extended'; streakLength: number }
  | { event: 'streak_broken'; streakLength: number }
  | { event: 'achievement_unlocked'; key: string; points: number }
  // ─── Monetization ─────────────────────────────────────────
  | {
      event: 'paywall_shown';
      trigger: 'manual' | 'remove_ads' | 'general';
      currentTier: string;
    }
  | {
      event: 'paywall_converted';
      plan: 'monthly' | 'annual';
      trialUsed: boolean;
      trigger: string;
    }
  | { event: 'coin_purchase'; pack: string; priceUsd: number }
  | { event: 'league_joined_paid'; entryFeeCoins: number; leagueType: string }
  // ─── Growth ───────────────────────────────────────────────
  | {
      event: 'share_generated';
      contentType: 'pick' | 'streak' | 'recap';
      destination?: string;
    }
  | { event: 'referral_invited'; channel: string }
  | { event: 'referral_converted'; daysToConvert: number }
  | { event: 'win_celebration_shown'; sport: SportKey; points: number }
  | { event: 'win_celebration_shared'; sport: SportKey; points: number }
  | { event: 'win_celebration_dismissed'; sport: SportKey; points: number }
  | { event: 'push_opened'; type: string }
  // ─── Ads ──────────────────────────────────────────────────
  | { event: 'rewarded_ad_completed'; coinsAwarded: number };

/**
 * Extract just the event name from a tagged-union member.
 * `AnalyticsEvent` from domain.ts already gives us the string literal
 * union of all names — this is a type-level alias for clarity.
 */
export type { AnalyticsEvent };
