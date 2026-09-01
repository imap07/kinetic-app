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

export const REGION_LABELS: Record<string, string> = {
  latam: 'Latin America',
  'north-america': 'North America',
  europe: 'Europe',
  asia: 'Asia',
  africa: 'Africa',
  oceania: 'Oceania',
  world: 'FIFA',
  other: 'Other',
};

export const REGION_ORDER = ['latam', 'north-america', 'europe', 'world', 'asia', 'africa', 'oceania', 'other'];

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
