import { apiClient } from './client';

// ─── Interfaces ──────────────────────────────────────────

export interface TeamInfo {
  apiId: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface Score {
  home: number | null;
  away: number | null;
}

export interface FixtureEvent {
  timeElapsed: number;
  timeExtra: number | null;
  teamApiId: number;
  teamName: string;
  playerName: string;
  assistName: string | null;
  type: string;
  detail: string;
}

export interface FixtureStatistic {
  teamApiId: number;
  teamName: string;
  stats: Record<string, any>;
}

export interface LineupPlayer {
  apiId: number;
  name: string;
  number: number;
  pos: string; // G, D, M, F
  grid: string | null; // "1:1", "2:3", etc.
  photo: string | null;
}

export interface TeamLineup {
  teamApiId: number;
  teamName: string;
  formation: string;
  coachName: string | null;
  coachPhoto: string | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface Fixture {
  _id: string;
  apiId: number;
  referee: string;
  timezone: string;
  date: string;
  timestamp: number;
  leagueApiId: number;
  leagueName: string;
  leagueLogo: string;
  leagueCountry: string;
  leagueRound: string;
  status: string;
  statusLong: string;
  elapsed: number | null;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeGoals: number;
  awayGoals: number;
  goalsHalftime: Score;
  goalsFulltime: Score;
  goalsExtratime: Score;
  goalsPenalty: Score;
  events: FixtureEvent[];
  statistics: FixtureStatistic[];
  lineups: TeamLineup[];
  venueName?: string;
  venueCity?: string;
  isFeatured: boolean;
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface League {
  _id: string;
  apiId: number;
  name: string;
  type: string;
  logo: string;
  countryName: string;
  countryCode: string;
  countryFlag: string;
  season: number;
  isActive: boolean;
  isFeatured: boolean;
}

export interface Team {
  _id: string;
  apiId: number;
  name: string;
  code: string;
  logo: string;
  countryName: string;
  isNational: boolean;
  founded: number;
  venueName: string;
  venueCity: string;
}

export interface DashboardData {
  liveMatches: Fixture[];
  todayMatches: Fixture[];
  upcomingMatches: Fixture[];
  recentMatches: Fixture[];
  featuredLeagues: League[];
}

export interface StandingEntry {
  rank: number;
  teamApiId: number;
  teamName: string;
  teamLogo: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
}

export interface LeagueDetail {
  league: League | null;
  standings: StandingEntry[] | null;
  liveFixtures: Fixture[];
  upcomingFixtures: Fixture[];
  recentResults: Fixture[];
  lastUpdated: string;
  source: 'api' | 'cache';
}

// ─── API Methods ─────────────────────────────────────────

export const footballApi = {
  getDashboard(token: string) {
    return apiClient.get<DashboardData>('/football/dashboard', { token });
  },

  getLeagueDetail(token: string, leagueApiId: number) {
    return apiClient.get<LeagueDetail>(`/football/leagues/${leagueApiId}/detail`, { token });
  },

  getLiveMatches(token: string) {
    return apiClient.get<{ matches: Fixture[] }>('/football/live', { token });
  },

  getFeaturedLeagues(token: string) {
    return apiClient.get<{ leagues: League[] }>('/football/leagues?featured=true', { token });
  },

  getAllLeagues(token: string) {
    return apiClient.get<{ leagues: League[] }>('/football/leagues', { token });
  },

  getFixturesByLeague(
    token: string,
    leagueId: number,
    params?: { from?: string; to?: string; status?: string },
  ) {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return apiClient.get<{ fixtures: Fixture[] }>(
      `/football/fixtures/league/${leagueId}${qs ? `?${qs}` : ''}`,
      { token },
    );
  },

  getFixtureDetail(token: string, fixtureApiId: number) {
    return apiClient.get<{ fixture: Fixture | null }>(
      `/football/fixtures/${fixtureApiId}`,
      { token },
    );
  },

  getHeadToHead(token: string, team1Id: number, team2Id: number) {
    return apiClient.get<{ fixtures: Fixture[] }>(
      `/football/h2h/${team1Id}/${team2Id}`,
      { token },
    );
  },

  searchTeams(token: string, query: string) {
    return apiClient.get<{ teams: Team[] }>(
      `/football/teams/search?q=${encodeURIComponent(query)}`,
      { token },
    );
  },
};
