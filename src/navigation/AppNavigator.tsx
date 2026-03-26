import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  LeaderboardStackParamList,
  ProfileStackParamList,
} from './types';

import { LoginScreen } from '../screens/LoginScreen';
import { RecoverPasswordRequestScreen } from '../screens/RecoverPasswordRequestScreen';
import { RecoverPasswordVerificationScreen } from '../screens/RecoverPasswordVerificationScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MatchPredictionScreen } from '../screens/MatchPredictionScreen';
import { PickSummaryScreen } from '../screens/PickSummaryScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { LiveScreen } from '../screens/LiveScreen';
import { MyPicksScreen } from '../screens/MyPicksScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SecurityPrivacyScreen } from '../screens/SecurityPrivacyScreen';
import { WalletRewardsScreen } from '../screens/WalletRewardsScreen';
import { CustomTabBar } from '../components/CustomTabBar';

const darkScreenOptions = {
  headerShown: false as const,
  contentStyle: { backgroundColor: '#0B0E11' },
  animation: 'slide_from_right' as const,
};

// ─── Auth Stack ──────────────────────────────────────────
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={darkScreenOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="RecoverPasswordRequest" component={RecoverPasswordRequestScreen} />
      <AuthStack.Screen name="RecoverPasswordVerification" component={RecoverPasswordVerificationScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Home Stack (Dashboard tab) ──────────────────────────
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={darkScreenOptions}>
      <HomeStack.Screen name="DashboardHome" component={DashboardScreen} />
      <HomeStack.Screen name="MatchPrediction" component={MatchPredictionScreen} />
      <HomeStack.Screen name="PickSummary" component={PickSummaryScreen} />
    </HomeStack.Navigator>
  );
}

// ─── Rewards Stack (Leaderboard tab) ─────────────────────
const RewardsStack = createNativeStackNavigator<LeaderboardStackParamList>();

function RewardsNavigator() {
  return (
    <RewardsStack.Navigator screenOptions={darkScreenOptions}>
      <RewardsStack.Screen name="LeaderboardHome" component={LeaderboardScreen} />
    </RewardsStack.Navigator>
  );
}

// ─── Profile Stack ────────────────────────────────────────
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={darkScreenOptions}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStack.Screen name="SecurityPrivacy" component={SecurityPrivacyScreen} />
      <ProfileStack.Screen name="WalletRewards" component={WalletRewardsScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Bottom Tab Navigator ────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      sceneContainerStyle={{ backgroundColor: '#0B0E11' }}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Live" component={LiveScreen} />
      <Tab.Screen name="MyPicks" component={MyPicksScreen} />
      <Tab.Screen name="Rewards" component={RewardsNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ──────────────────────────────────────
const RootStack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Auth" component={AuthNavigator} />
        <RootStack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{ animation: 'fade' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
