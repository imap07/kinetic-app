import { apiClient } from './client';

// ─── Types ─────────────────────────────────────────────────

/**
 * Shape of a favorite-team entry, matching the backend user document.
 * `teamApiId` is only unique within a sport, so `sport` is always part
 * of the logical key used for add/remove operations.
 */
export interface FavoriteTeam {
  sport: string;
  teamApiId: number;
  teamName: string;
  teamLogo?: string;
  leagueApiId?: number;
  leagueName?: string;
}

export interface FavoriteTeamsResponse {
  message: string;
  favoriteTeams: FavoriteTeam[];
}

export interface BulkAddLeagueTeamsResponse extends FavoriteTeamsResponse {
  /** Number of teams actually inserted (existing dedup'd entries are ignored). */
  added: number;
  /** Total teams the server resolved from the league before dedup. */
  fetched: number;
}

// ─── API ───────────────────────────────────────────────────
//
// Kept separate from favoriteLeagues so the two can evolve
// independently — they target different user-document fields and
// different semantic surfaces (team picks vs league picks).

export const favoriteTeamsApi = {
  /** Replace the full favoriteTeams list (bulk set). */
  setFavoriteTeams(token: string, teams: FavoriteTeam[]) {
    return apiClient.patch<FavoriteTeamsResponse>(
      '/auth/favorite-teams',
      { teams },
      { token },
    );
  },

  /** Add a single team. Idempotent on `(sport, teamApiId)`. */
  addFavoriteTeam(token: string, team: FavoriteTeam) {
    return apiClient.post<FavoriteTeamsResponse>(
      '/auth/favorite-teams',
      team,
      { token },
    );
  },

  /** Remove a single team by `(sport, teamApiId)`. */
  removeFavoriteTeam(token: string, sport: string, teamApiId: number) {
    return apiClient.delete<FavoriteTeamsResponse>(
      `/auth/favorite-teams/${encodeURIComponent(sport)}/${teamApiId}`,
      { token },
    );
  },

  /**
   * Server-side expand: picks up every team of the given league and
   * merges them into favoriteTeams. Dedup is enforced server-side so
   * this is safe to call even if some teams are already followed.
   */
  bulkAddLeagueTeams(token: string, sport: string, leagueApiId: number) {
    return apiClient.post<BulkAddLeagueTeamsResponse>(
      '/auth/favorite-teams/bulk-add-league',
      { sport, leagueApiId },
      { token },
    );
  },
};
