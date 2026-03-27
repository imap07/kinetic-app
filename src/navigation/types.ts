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
  LeagueDetail: { leagueApiId: number; leagueName: string };
  MatchPrediction: { fixtureApiId: number };
  PickSummary: undefined;
};

// Leaderboard tab nested stack
export type LeaderboardStackParamList = {
  LeaderboardHome: undefined;
};

// Profile tab nested stack
export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  SecurityPrivacy: undefined;
  WalletRewards: undefined;
};

// Live tab nested stack
export type LiveStackParamList = {
  LiveHome: undefined;
  LiveMatchPrediction: { fixtureApiId: number };
  LivePickSummary: undefined;
};

// Bottom tab navigator
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Live: NavigatorScreenParams<LiveStackParamList>;
  MyPicks: undefined;
  Rewards: NavigatorScreenParams<LeaderboardStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Root navigator that switches between Auth and Main
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
