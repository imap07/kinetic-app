import { apiClient } from './client';

// ─── Types ─────────────────────────────────────────────────

export interface FootballLeague {
  _id: string;
  apiId: number;
  name: string;
  type: string;
  logo: string;
  countryName: string;
  countryCode?: string;
  countryFlag?: string;
  region: string;
  priority: number;
  isFeatured: boolean;
  seeded: boolean;
  teamsCount?: number;
}

export interface GlobalLeaguesResponse {
  leagues: FootballLeague[];
  byRegion: Record<string, FootballLeague[]>;
  total: number;
}

// ─── Region display helpers ────────────────────────────────

/**
 * i18n key per region, NOT a literal — these are pill labels a user in ES/FR/PT
 * reads. Resolve with `t(regionLabelKey(region))`.
 *
 * The backend groups leagues by CONFEDERATION (see
 * `seeding.service.ts:regionForLeague`), so `north-america` is CONCACAF — Liga
 * MX, the Leagues Cup and the CONCACAF Champions Cup sit there with MLS — and
 * `latam` is CONMEBOL, hence "South America".
 *
 * `world` was labelled "FIFA" while holding all 58 World-country competitions,
 * the Champions League and the Libertadores included. Those now route to their
 * own confederation; what is left really is global, hence "International".
 */
const REGION_LABEL_KEYS: Record<string, string> = {
  all: 'editFavorites.regions.all',
  'north-america': 'editFavorites.regions.northAmerica',
  latam: 'editFavorites.regions.southAmerica',
  europe: 'editFavorites.regions.europe',
  world: 'editFavorites.regions.international',
  asia: 'editFavorites.regions.asia',
  africa: 'editFavorites.regions.africa',
  oceania: 'editFavorites.regions.oceania',
  other: 'editFavorites.regions.other',
};

/**
 * i18n key for a region pill. Falls back to `editFavorites.regions.other` for a
 * region the backend adds before the app knows about it — better an honest
 * "Other" than a raw slug like `north-america` in the UI.
 */
export function regionLabelKey(region: string): string {
  return REGION_LABEL_KEYS[region] ?? REGION_LABEL_KEYS.other;
}

// Core market first: Kinetic's users are in the USA, Canada and Mexico, all
// three of which are now the same pill.
export const REGION_ORDER = ['north-america', 'europe', 'latam', 'world', 'asia', 'africa', 'oceania', 'other'];

// ─── API ───────────────────────────────────────────────────

export const footballLeaguesApi = {
  /** Get all football leagues, optionally filtered by region. */
  getGlobalLeagues(token: string, region?: string) {
    const params = new URLSearchParams();
    if (region) params.set('region', region);
    const qs = params.toString();
    return apiClient.get<GlobalLeaguesResponse>(
      `/football/leagues/global${qs ? `?${qs}` : ''}`,
      { token },
    );
  },

  /**
   * Replace the full favorites list. Each entry carries its sport — league
   * ids collide across API-Sports hosts (id 1 = NFL = MLB = AFL = Australian
   * GP), so a bare id list cannot express "the NBA but not the Australian GP".
   * Entries without `sport` are legacy favorites the client could not attribute.
   */
  async setFavoriteLeagues(token: string, leagues: { leagueApiId: number; sport?: string }[]) {
    try {
      return await apiClient.patch<{ message: string; favoriteLeagues: any[] }>(
        '/auth/favorite-leagues',
        { leagues },
        { token },
      );
    } catch (err: any) {
      // A backend older than 2026-09-01 whitelists `leagueApiIds` only and
      // answers 400 "property leagues should not exist". Fall back to the
      // legacy shape (sport dropped) instead of failing the save.
      const msgs: string[] = Array.isArray(err?.data?.message) ? err.data.message : [String(err?.data?.message ?? '')];
      if (err?.status === 400 && msgs.some((m) => /property leagues should not exist/i.test(m))) {
        const leagueApiIds = Array.from(new Set(leagues.map((l) => l.leagueApiId)));
        return apiClient.patch<{ message: string; favoriteLeagues: any[] }>(
          '/auth/favorite-leagues',
          { leagueApiIds },
          { token },
        );
      }
      throw err;
    }
  },

  /** Add a single favorite league */
  addFavoriteLeague(token: string, leagueApiId: number) {
    return apiClient.post<{ message: string; favoriteLeagues: any[] }>(
      `/auth/favorite-leagues/${leagueApiId}`,
      undefined,
      { token },
    );
  },

  /** Remove a single favorite league */
  removeFavoriteLeague(token: string, leagueApiId: number) {
    return apiClient.delete<{ message: string; favoriteLeagues: any[] }>(
      `/auth/favorite-leagues/${leagueApiId}`,
      { token },
    );
  },

  /** Set region preference */
  setRegion(token: string, region: string) {
    return apiClient.patch<{ message: string }>(
      '/auth/region',
      { region },
      { token },
    );
  },
};
