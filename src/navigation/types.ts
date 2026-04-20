import type { NavigatorScreenParams } from '@react-navigation/native';

// Auth flow screens
export type AuthStackParamList = {
  Login: undefined;
  EmailAuth: undefined;
  RecoverPasswordRequest: undefined;
  RecoverPasswordVerification: { email: string };
  ResetPassword: { email: string; code: string };
};

// F1 race prediction screen params (shared across stacks)
export type F1RacePredictionParams = {
  raceApiId: number;
  competitionName?: string;
  circuitName?: string;
};

// Home tab nested stack (Dashboard -> MatchPrediction -> PickSummary)
export type HomeStackParamList = {
  DashboardHome: undefined;
  LeagueDetail: { leagueApiId: number; leagueName: string; sport: string };
  MatchPrediction: { fixtureApiId: number; sport?: string };
  F1RacePrediction: F1RacePredictionParams;
  PickSummary: undefined;
  Quests: undefined;
};

// Leagues tab nested stack
export type LeaguesStackParamList = {
  LeaguesHome: undefined;
  CoinLeagueDetail: { leagueId: string };
  LeaguePicksFeed: { leagueId: string; leagueName?: string };
  LeagueMatchPrediction: { fixtureApiId: number; sport?: string };
  LeagueF1RacePrediction: F1RacePredictionParams;
  LeaguePickSummary: undefined;
  Leaderboard: undefined;
  QRScanner: undefined;
};

// Profile tab nested stack
export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  EditFavoriteSports: undefined;
  EditFavoriteLeagues: undefined;
  EditFavoriteTeams: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  SportNotificationPreferences: { sport: string; sportName: string };
  SecurityPrivacy: undefined;
  WalletRewards: undefined;
  CoinStore: undefined;
  GiftcardRedeem: undefined;
  StreakLeaderboard: undefined;
};

// Live tab nested stack
export type LiveStackParamList = {
  LiveHome: undefined;
  LiveMatchPrediction: { fixtureApiId: number; sport?: string };
  LiveF1RacePrediction: F1RacePredictionParams;
  LivePickSummary: undefined;
};

// Bottom tab navigator
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Live: NavigatorScreenParams<LiveStackParamList>;
  Leagues: NavigatorScreenParams<LeaguesStackParamList>;
  MyPicks: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type PaywallTrigger =
  | 'remove_ads'
  | 'general';

// Self-reported acquisition channel. Must stay in sync with the backend
// AcquisitionSource enum in src/users/schemas/user.schema.ts.
export type AcquisitionSourceKey =
  | 'instagram'
  | 'tiktok'
  | 'friend'
  | 'appstore'
  | 'google'
  | 'youtube'
  | 'twitter'
  | 'other';

// Full shape of a favorite-team selection carried through the onboarding
// flow. The backend DTO (complete-onboarding.dto.ts) requires teamApiId,
// teamName, leagueApiId — so we must collect and forward them all the way
// from TeamSelectionScreen. Storing only { apiId, sport } silently loses
// the other fields and the final POST /auth/onboarding 400s.
export type OnboardingFavoriteTeam = {
  teamApiId: number;
  sport: string;
  teamName: string;
  teamLogo?: string;
  // Optional: F1 constructors have no league in the API-Football model.
  leagueApiId?: number;
  leagueName?: string;
};

/**
 * A league the user picked directly in the Leagues tab (independent of
 * any team pick). Threaded through the onboarding flow alongside
 * favoriteTeams and surfaced on the backend as `favoriteLeagues` on the
 * onboarding DTO.
 */
export type OnboardingFavoriteLeague = {
  leagueApiId: number;
  sport: string;
  leagueName?: string;
  leagueLogo?: string;
};

// Root navigator that switches between Auth, Onboarding, and Main
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  SportSelection: undefined;
  TeamSelection: { selectedSports: string[] };
  NotificationSetup: {
    sports: string[];
    favoriteTeams: OnboardingFavoriteTeam[];
    favoriteLeagues?: OnboardingFavoriteLeague[];
  };
  AcquisitionSource: {
    sports: string[];
    favoriteTeams: OnboardingFavoriteTeam[];
    favoriteLeagues?: OnboardingFavoriteLeague[];
    permissionGranted?: boolean;
    notificationScope?: 'my_teams' | 'all_games';
    notificationTypes?: {
      gameStart: boolean;
      liveScores: boolean;
      gameEnd: boolean;
      predictionResults: boolean;
    };
  };
  OnboardingComplete: {
    sports: string[];
    favoriteTeams: OnboardingFavoriteTeam[];
    favoriteLeagues?: OnboardingFavoriteLeague[];
    acquisitionSource?: AcquisitionSourceKey | null;
    permissionGranted?: boolean;
    notificationScope?: 'my_teams' | 'all_games';
    notificationTypes?: {
      gameStart: boolean;
      liveScores: boolean;
      gameEnd: boolean;
      predictionResults: boolean;
    };
  };
  LeagueSelection: { selectedSports?: string[] };
  Main: NavigatorScreenParams<MainTabParamList>;
  Notifications: undefined;
  NotificationPreferences: undefined;
  SportNotificationPreferences: { sport: string; sportName: string };
  Paywall: {
    trigger: PaywallTrigger;
  };
  Search: undefined;
};
