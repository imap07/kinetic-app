export { apiClient, ApiError } from './client';
export { authApi } from './auth';
export type { AuthTokens, User, SocialProvider, UpdateProfileData, UpdatePreferencesData, SessionInfo } from './auth';
export { API_BASE_URL } from './config';
export { footballApi } from './football';
export type {
  Fixture,
  League,
  Team,
  TeamInfo,
  FixtureEvent,
  FixtureStatistic,
  LineupPlayer,
  TeamLineup,
  DashboardData,
  LeagueDetail,
  StandingEntry,
} from './football';
export { sportsApi, SPORT_TABS, FREE_SPORT } from './sports';
export type {
  SportKey,
  SportMeta,
  SportDashboard,
  SportLeagueDetail,
  SportStandingEntry,
  SportGame,
  SportLeague,
  SportTeamInfo,
} from './sports';
export { predictionsApi, leaderboardApi } from './predictions';
export type {
  PredictionData,
  CreatePredictionPayload,
  MyPicksResponse,
  MyStatsResponse,
  DailyStatusResponse,
  QuestProgress,
  DetailedStatsResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  MyRankResponse,
} from './predictions';
export { coinsApi } from './coins';
export type { WalletBalance, CoinTransaction, CoinTransactionsResponse, CoinPackage, CoinPackagesResponse } from './coins';
export { leaguesApi } from './leagues';
export type { CoinLeague, LeagueParticipant, LeaguesListResponse, CreateLeagueDto } from './leagues';
export { giftcardsApi } from './giftcards';
export type { GiftcardCatalog, GiftcardCatalogItem, GiftcardDenomination, GiftcardRedemption, RedemptionsResponse } from './giftcards';
export { legalApi } from './legal';
export type { LegalDocument } from './legal';
export { notificationsApi } from './notifications';
export type { NotificationLog, NotificationHistoryResponse } from './notifications';
export { achievementsApi } from './achievements';
export type { Achievement } from './achievements';
export { rewardsApi } from './rewards';
export type { RewardStatus } from './rewards';
