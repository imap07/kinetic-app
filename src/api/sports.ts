import { apiClient } from './client';

export type SportKey =
  | 'football'
  | 'basketball'
  | 'hockey'
  | 'american-football'
  | 'baseball'
  | 'formula-1'
  | 'afl'
  | 'handball'
  | 'rugby'
  | 'volleyball'
  | 'mma';

export interface SportMeta {
  key: SportKey;
  name: string;
  icon: string;
}

export const FREE_SPORT: SportKey = 'football';

export const RECENT_GAMES_LIMIT = 15;

export const SPORT_TABS: SportMeta[] = [
  { key: 'football', name: 'Soccer', icon: 'football' },
  { key: 'basketball', name: 'Basketball', icon: 'basketball' },
  { key: 'hockey', name: 'Hockey', icon: 'hockey-puck' },
  { key: 'american-football', name: 'Football', icon: 'football-outline' },
  { key: 'baseball', name: 'Baseball', icon: 'baseball' },
  { key: 'formula-1', name: 'F1', icon: 'car-sport' },
  { key: 'afl', name: 'AFL', icon: 'american-football' },
  { key: 'handball', name: 'Handball', icon: 'hand-left' },
  { key: 'rugby', name: 'Rugby', icon: 'football' },
  { key: 'volleyball', name: 'Volleyball', icon: 'basketball-outline' },
  { key: 'mma', name: 'MMA', icon: 'fitness' },
];

export interface SportTeamInfo {
  apiId: number;
  name: string;
  logo: string;
}

export interface SportLeague {
  apiId: number;
  name: string;
  type?: string;
  logo: string;
  countryName?: string;
  countryCode?: string;
  countryFlag?: string;
  season?: string | number;
  isFeatured?: boolean;
  isActive?: boolean;
  tier?: 'free' | 'premium';
}

export interface SportGame {
  apiId: number;
  _id?: string;
  date: string;
  status: string;
  statusLong?: string;
  timer?: string | number | null;
  leagueApiId: number;
  leagueName: string;
  leagueLogo?: string;
  homeTeam: SportTeamInfo;
  awayTeam: SportTeamInfo;
  homeTotal: number;
  awayTotal: number;
  homeScore?: any;
  awayScore?: any;
  isLive: boolean;
  // F1 specific
  circuit?: { name: string; image: string; city: string; country: string };
  competitionName?: string;
  results?: any[];
  type?: string;
}

export interface SportDashboard {
  sport: SportKey;
  liveGames: SportGame[];
  todayGames: SportGame[];
  recentGames: SportGame[];
  upcomingGames: SportGame[];
  featuredLeagues: SportLeague[];
  userFavoriteLeagueIds?: number[];
}

export interface SportStandingEntry {
  rank: number;
  teamApiId?: number;
  teamName: string;
  teamLogo: string;
  played?: number;
  won?: number;
  lost?: number;
  drawn?: number;
  tied?: number;
  points?: number;
  percentage?: string;
  form?: string;
  description?: string;
  // F1 specific
  driverApiId?: number;
  driverName?: string;
  driverImage?: string;
  wins?: number;
}

export interface SportLeagueDetail {
  league: SportLeague | null;
  standings: SportStandingEntry[] | null;
  liveGames: SportGame[];
  upcomingGames: SportGame[];
  recentResults: SportGame[];
  lastUpdated: string;
  source: 'api' | 'cache';
}

export interface PopularTeam {
  apiId: number;
  name: string;
  logo: string;
  leagueName?: string;
}

export interface LeagueFilter {
  apiId: number;
  name: string;
  countryName: string;
  logo?: string;
}

export interface PopularTeamsResponse {
  teams: PopularTeam[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
  countries?: string[];
  leagues?: LeagueFilter[];
}

export const sportsApi = {
  getPopularTeams(token: string, sport: SportKey, opts: { page?: number; limit?: number; countries?: string[]; leagueIds?: number[]; search?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.countries?.length) params.set('countries', opts.countries.join(','));
    if (opts.leagueIds?.length) params.set('leagueIds', opts.leagueIds.join(','));
    if (opts.search) params.set('search', opts.search);
    const qs = params.toString();
    return apiClient.get<PopularTeamsResponse>(`/sports/${sport}/popular-teams${qs ? `?${qs}` : ''}`, { token });
  },

  getAvailableSports(token: string) {
    return apiClient.get<SportMeta[]>('/sports', { token });
  },

  getDashboard(token: string, sport: SportKey) {
    return apiClient.get<SportDashboard>(`/sports/${sport}/dashboard`, { token });
  },

  getLeagueDetail(token: string, sport: SportKey, leagueApiId: number) {
    return apiClient.get<SportLeagueDetail>(`/sports/${sport}/leagues/${leagueApiId}/detail`, { token });
  },

  getGameDetail(token: string, sport: SportKey, gameApiId: number) {
    return apiClient.get<SportGame>(`/sports/${sport}/games/${gameApiId}`, { token });
  },

  getLeagues(token: string, sport: SportKey) {
    return apiClient.get<SportLeague[]>(`/sports/${sport}/leagues`, { token });
  },

  getF1Teams(token: string, search?: string): Promise<F1TeamsResponse> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient.get<F1TeamsResponse>(`/sports/formula-1/popular-teams${qs}`, { token });
  },

  search(token: string, query: string) {
    return apiClient.get<SearchResults>(
      `/sports/search?q=${encodeURIComponent(query)}`,
      { token },
    );
  },
};

export interface F1Driver {
  apiId: number;
  name: string;
  abbr?: string;
  number?: number;
  image?: string;
  nationality?: string;
  points?: number;
  position?: number;
}

export interface F1Team {
  apiId: number;
  name: string;
  logo?: string;
  base?: string;
  points?: number;
  position?: number;
  drivers: F1Driver[];
}

export interface F1TeamsResponse {
  teams: F1Team[];
  total: number;
}

export interface SearchTeamResult {
  apiId: number;
  name: string;
  logo?: string;
  countryName?: string;
  leagueApiId?: number;
  leagueTier?: 'free' | 'premium';
}

export interface SearchLeagueResult {
  apiId: number;
  name: string;
  logo?: string;
  countryName?: string;
  countryFlag?: string;
  type?: string;
  tier?: 'free' | 'premium';
  region?: string;
}

export interface SearchMatchResult {
  apiId: number;
  date: string;
  status: string;
  leagueApiId: number;
  leagueName: string;
  leagueLogo?: string;
  leagueTier?: 'free' | 'premium';
  homeTeam: { apiId: number; name: string; logo?: string };
  awayTeam: { apiId: number; name: string; logo?: string };
}

export interface SearchResults {
  teams: SearchTeamResult[];
  leagues: SearchLeagueResult[];
  matches: SearchMatchResult[];
}
