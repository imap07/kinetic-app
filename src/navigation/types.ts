import type { NavigatorScreenParams } from '@react-navigation/native';

// Auth flow screens
export type AuthStackParamList = {
  Login: undefined;
  EmailAuth: undefined;
  RecoverPasswordRequest: undefined;
  RecoverPasswordVerification: { email: string };
  ResetPassword: { email: string; code: string };
};

// Home tab nested stack (Dashboard -> MatchPrediction -> PickSummary)
export type HomeStackParamList = {
  DashboardHome: undefined;
  LeagueDetail: { leagueApiId: number; leagueName: string; sport: string; tier?: 'free' | 'premium' };
  MatchPrediction: { fixtureApiId: number; sport?: string };
  PickSummary: undefined;
  Quests: undefined;
};

// Leagues tab nested stack
export type LeaguesStackParamList = {
  LeaguesHome: undefined;
  CoinLeagueDetail: { leagueId: string };
  LeagueMatchPrediction: { fixtureApiId: number; sport?: string };
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
  SecurityPrivacy: undefined;
  WalletRewards: undefined;
  CoinStore: undefined;
  GiftcardRedeem: undefined;
};

// Live tab nested stack
export type LiveStackParamList = {
  LiveHome: undefined;
  LiveMatchPrediction: { fixtureApiId: number; sport?: string };
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
  | 'daily_limit'
  | 'exact_score'
  | 'sport_locked'
  | 'detailed_stats'
  | 'leaderboard'
  | 'premium_league'
  | 'quest_multi_sport'
  | 'general';

// Root navigator that switches between Auth, Onboarding, and Main
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  SportSelection: undefined;
  LeagueSelection: { selectedSports?: string[] };
  Main: NavigatorScreenParams<MainTabParamList>;
  Notifications: undefined;
  Paywall: {
    trigger: PaywallTrigger;
    sportName?: string;
    dailyUsed?: number;
    dailyLimit?: number;
  };
  Search: undefined;
};
