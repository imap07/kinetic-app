import type { NavigatorScreenParams } from '@react-navigation/native';

// Auth flow screens
export type AuthStackParamList = {
  Login: undefined;
  RecoverPasswordRequest: undefined;
  RecoverPasswordVerification: undefined;
};

// Home tab nested stack (Dashboard -> MatchPrediction -> PickSummary)
export type HomeStackParamList = {
  DashboardHome: undefined;
  MatchPrediction: undefined;
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

// Bottom tab navigator
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Live: undefined;
  MyPicks: undefined;
  Rewards: NavigatorScreenParams<LeaderboardStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Root navigator that switches between Auth and Main
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
