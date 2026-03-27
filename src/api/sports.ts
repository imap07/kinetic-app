import { apiClient } from './client';

export type SportKey =
  | 'football'
  | 'basketball'
  | 'hockey'
  | 'american-football'
  | 'baseball'
  | 'formula-1';

export interface SportMeta {
  key: SportKey;
  name: string;
  icon: string;
}

export const SPORT_TABS: SportMeta[] = [
  { key: 'football', name: 'Soccer', icon: 'football' },
  { key: 'basketball', name: 'Basketball', icon: 'basketball' },
  { key: 'hockey', name: 'Hockey', icon: 'hockey-puck' },
  { key: 'american-football', name: 'Football', icon: 'football-outline' },
  { key: 'baseball', name: 'Baseball', icon: 'baseball' },
  { key: 'formula-1', name: 'F1', icon: 'car-sport' },
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
  recentGames: SportGame[];
  upcomingGames: SportGame[];
  featuredLeagues: SportLeague[];
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

export const sportsApi = {
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
};
