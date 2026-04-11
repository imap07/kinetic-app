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
  LeagueMatchPrediction: { fixtureApiId: number; sport?: string };
  LeagueF1RacePrediction: F1RacePredictionParams;
  LeaguePickSummary: undefined;
  Leaderboard: undefined;
};

// Profile tab nested stack
export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  EditFavoriteSports: undefined;
  EditFavoriteLeagues: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  SportNotificationPreferences: { sport: string; sportName: string };
  SecurityPrivacy: undefined;
  WalletRewards: undefined;
  CoinStore: undefined;
  GiftcardRedeem: undefined;
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

// Root navigator that switches between Auth, Onboarding, and Main
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  SportSelection: undefined;
  TeamSelection: { selectedSports: string[] };
  OnboardingComplete: { sports: string[]; favoriteTeams: { apiId: number; sport: string }[] };
  LeagueSelection: { selectedSports?: string[] };
  Main: NavigatorScreenParams<MainTabParamList>;
  Notifications: undefined;
  Paywall: {
    trigger: PaywallTrigger;
  };
  Search: undefined;
};
