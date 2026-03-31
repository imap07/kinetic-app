import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  LiveStackParamList,
  LeaguesStackParamList,
  ProfileStackParamList,
} from './types';
import { useAuth } from '../contexts/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { colors } from '../theme';
import { OnboardingScreen, ONBOARDING_COMPLETE_KEY } from '../screens/OnboardingScreen';
import { SportSelectionScreen } from '../screens/SportSelectionScreen';

import { LoginScreen } from '../screens/LoginScreen';
import { EmailAuthScreen } from '../screens/EmailAuthScreen';
import { RecoverPasswordRequestScreen } from '../screens/RecoverPasswordRequestScreen';
import { RecoverPasswordVerificationScreen } from '../screens/RecoverPasswordVerificationScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
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
import { LeagueDetailScreen } from '../screens/LeagueDetailScreen';
import { CustomTabBar } from '../components/CustomTabBar';
import { PaywallScreen } from '../screens/PaywallScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { CoinStoreScreen } from '../screens/CoinStoreScreen';
import { CoinLeaguesScreen } from '../screens/CoinLeaguesScreen';
import { GiftcardRedeemScreen } from '../screens/GiftcardRedeemScreen';
import { QuestsScreen } from '../screens/QuestsScreen';
import { LeagueSelectionScreen } from '../screens/LeagueSelectionScreen';
import { logScreenView } from '../services/analytics';

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
      <AuthStack.Screen name="EmailAuth" component={EmailAuthScreen} />
      <AuthStack.Screen name="RecoverPasswordRequest" component={RecoverPasswordRequestScreen} />
      <AuthStack.Screen name="RecoverPasswordVerification" component={RecoverPasswordVerificationScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Home Stack (Dashboard tab) ──────────────────────────
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={darkScreenOptions}>
      <HomeStack.Screen name="DashboardHome" component={DashboardScreen} />
      <HomeStack.Screen name="LeagueDetail" component={LeagueDetailScreen} />
      <HomeStack.Screen name="MatchPrediction" component={MatchPredictionScreen} />
      <HomeStack.Screen name="PickSummary" component={PickSummaryScreen} />
      <HomeStack.Screen name="Quests" component={QuestsScreen} />
    </HomeStack.Navigator>
  );
}

// ─── Live Stack ──────────────────────────────────────────
const LiveStack = createNativeStackNavigator<LiveStackParamList>();

function LiveNavigator() {
  return (
    <LiveStack.Navigator screenOptions={darkScreenOptions}>
      <LiveStack.Screen name="LiveHome" component={LiveScreen} />
      <LiveStack.Screen name="LiveMatchPrediction" component={MatchPredictionScreen} />
      <LiveStack.Screen name="LivePickSummary" component={PickSummaryScreen} />
    </LiveStack.Navigator>
  );
}

// ─── Leagues Stack (Leagues tab) ─────────────────────────
const LeaguesStack = createNativeStackNavigator<LeaguesStackParamList>();

function LeaguesNavigator() {
  return (
    <LeaguesStack.Navigator screenOptions={darkScreenOptions}>
      <LeaguesStack.Screen name="LeaguesHome" component={CoinLeaguesScreen} />
      <LeaguesStack.Screen name="Leaderboard" component={LeaderboardScreen} />
    </LeaguesStack.Navigator>
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
      <ProfileStack.Screen name="CoinStore" component={CoinStoreScreen} />
      <ProfileStack.Screen name="GiftcardRedeem" component={GiftcardRedeemScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Bottom Tab Navigator ────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  const { tokens } = useAuth();
  usePushNotifications(tokens?.accessToken);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Live" component={LiveNavigator} />
      <Tab.Screen name="Leagues" component={LeaguesNavigator} />
      <Tab.Screen name="MyPicks" component={MyPicksScreen} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

// ─── Onboarding Wrapper ──────────────────────────────────
function OnboardingWrapper({ navigation }: any) {
  const handleComplete = useCallback(() => {
    navigation.replace('SportSelection');
  }, [navigation]);

  return <OnboardingScreen onComplete={handleComplete} />;
}

// ─── Sport Selection Wrapper ─────────────────────────────
function SportSelectionWrapper({ navigation }: any) {
  const handleComplete = useCallback((selectedSports: string[]) => {
    navigation.replace('LeagueSelection', { selectedSports });
  }, [navigation]);

  return <SportSelectionScreen onComplete={handleComplete} />;
}

// ─── League Selection Wrapper ────────────────────────────
function LeagueSelectionWrapper({ navigation, route }: any) {
  const { refreshProfile } = useAuth();
  const selectedSports: string[] | undefined = route?.params?.selectedSports;

  const handleComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    try { await refreshProfile(); } catch {}
    navigation.replace('Main');
  }, [navigation, refreshProfile]);

  return <LeagueSelectionScreen onComplete={handleComplete} selectedSports={selectedSports} />;
}

// ─── Root Navigator ──────────────────────────────────────
const RootStack = createNativeStackNavigator<RootStackParamList>();

function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
}

export function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  const onNavigationStateChange = useCallback((state: NavigationState | undefined) => {
    const currentRouteName = getActiveRouteName(state);
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      logScreenView(currentRouteName);
    }
    routeNameRef.current = currentRouteName;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Not logged in yet — reset to null so we re-evaluate after login
      setOnboardingDone(null);
      return;
    }

    // Use backend as source of truth: if user.onboardingCompleted is true,
    // they've already completed it (possibly on another device)
    if (user.onboardingCompleted) {
      AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      setOnboardingDone(true);
    } else {
      // New user or hasn't finished onboarding — always show it
      AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
      setOnboardingDone(false);
    }
  }, [isAuthenticated, user]);

  if (isLoading || (isAuthenticated && onboardingDone === null)) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer onStateChange={onNavigationStateChange}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          onboardingDone ? (
            <>
              <RootStack.Screen
                name="Main"
                component={MainTabNavigator}
                options={{ animation: 'fade' }}
              />
              <RootStack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="Paywall"
                component={PaywallScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
              />
              <RootStack.Screen
                name="Search"
                component={SearchScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal', headerShown: false }}
              />
            </>
          ) : (
            <>
              <RootStack.Screen
                name="Onboarding"
                component={OnboardingWrapper}
                options={{ animation: 'fade' }}
              />
              <RootStack.Screen
                name="SportSelection"
                component={SportSelectionWrapper}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="LeagueSelection"
                component={LeagueSelectionWrapper}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="Main"
                component={MainTabNavigator}
                options={{ animation: 'fade' }}
              />
              <RootStack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="Paywall"
                component={PaywallScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
              />
              <RootStack.Screen
                name="Search"
                component={SearchScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal', headerShown: false }}
              />
            </>
          )
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
