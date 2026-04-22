import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationState, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
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
  OnboardingFavoriteTeam,
  OnboardingFavoriteLeague,
} from './types';
import { useAuth } from '../contexts/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { colors } from '../theme';
import { ONBOARDING_COMPLETE_KEY } from '../screens/OnboardingScreen';
import { SportSelectionScreen } from '../screens/SportSelectionScreen';
import { TeamSelectionScreen } from '../screens/TeamSelectionScreen';
import { AcquisitionSourceScreen, AcquisitionSourceKey } from '../screens/AcquisitionSourceScreen';
import { NotificationSetupScreen, NotificationSetupResult } from '../screens/NotificationSetupScreen';
import { OnboardingCompleteScreen } from '../screens/OnboardingCompleteScreen';

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
import { NotificationPreferencesScreen } from '../screens/NotificationPreferencesScreen';
import { SportNotificationPreferencesScreen } from '../screens/SportNotificationPreferencesScreen';
import { SecurityPrivacyScreen } from '../screens/SecurityPrivacyScreen';
import { WalletRewardsScreen } from '../screens/WalletRewardsScreen';
import { LeagueDetailScreen } from '../screens/LeagueDetailScreen';
import { CustomTabBar } from '../components/CustomTabBar';
import { PaywallScreen } from '../screens/PaywallScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { CoinStoreScreen } from '../screens/CoinStoreScreen';
import { CoinLeaguesScreen } from '../screens/CoinLeaguesScreen';
import { CoinLeagueDetailScreen } from '../screens/CoinLeagueDetailScreen';
import { LeaguePicksFeedScreen } from '../screens/LeaguePicksFeedScreen';
import { ReferralsScreen } from '../screens/ReferralsScreen';
import { GiftcardRedeemScreen } from '../screens/GiftcardRedeemScreen';
import { StreakLeaderboardScreen } from '../screens/StreakLeaderboardScreen';
import { EditFavoriteSportsScreen } from '../screens/EditFavoriteSportsScreen';
import { EditFavoriteLeaguesScreen } from '../screens/EditFavoriteLeaguesScreen';
import { EditFavoriteTeamsScreen } from '../screens/EditFavoriteTeamsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { QuestsScreen } from '../screens/QuestsScreen';
import { QRScannerScreen } from '../screens/QRScannerScreen';
import { JoinLeagueScreen } from '../screens/JoinLeagueScreen';
import F1RacePredictionScreen from '../screens/F1RacePredictionScreen';
// LeagueSelectionScreen removed from onboarding V2 flow
import { logScreenView } from '../services/analytics';
import { navigationRef } from './navigationRef';
import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';

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
      <HomeStack.Screen name="F1RacePrediction" component={F1RacePredictionScreen} />
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
      <LiveStack.Screen name="LiveF1RacePrediction" component={F1RacePredictionScreen} />
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
      <LeaguesStack.Screen name="CoinLeagueDetail" component={CoinLeagueDetailScreen} />
      <LeaguesStack.Screen name="LeaguePicksFeed" component={LeaguePicksFeedScreen} />
      <LeaguesStack.Screen name="LeagueMatchPrediction" component={MatchPredictionScreen} />
      <LeaguesStack.Screen name="LeagueF1RacePrediction" component={F1RacePredictionScreen} />
      <LeaguesStack.Screen name="LeaguePickSummary" component={PickSummaryScreen} />
      <LeaguesStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <LeaguesStack.Screen name="QRScanner" component={QRScannerScreen} />
      <LeaguesStack.Screen name="JoinLeague" component={JoinLeagueScreen} />
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
      <ProfileStack.Screen name="EditFavoriteSports" component={EditFavoriteSportsScreen} />
      <ProfileStack.Screen name="EditFavoriteLeagues" component={EditFavoriteLeaguesScreen} />
      <ProfileStack.Screen name="EditFavoriteTeams" component={EditFavoriteTeamsScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <ProfileStack.Screen name="SportNotificationPreferences" component={SportNotificationPreferencesScreen} />
      <ProfileStack.Screen name="SecurityPrivacy" component={SecurityPrivacyScreen} />
      <ProfileStack.Screen name="WalletRewards" component={WalletRewardsScreen} />
      <ProfileStack.Screen name="CoinStore" component={CoinStoreScreen} />
      <ProfileStack.Screen name="GiftcardRedeem" component={GiftcardRedeemScreen} />
      <ProfileStack.Screen name="StreakLeaderboard" component={StreakLeaderboardScreen} />
      <ProfileStack.Screen name="Referrals" component={ReferralsScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Error-boundary-wrapped navigators for main tabs ────
function HomeWithBoundary() {
  return <ScreenErrorBoundary><HomeNavigator /></ScreenErrorBoundary>;
}
function LiveWithBoundary() {
  return <ScreenErrorBoundary><LiveNavigator /></ScreenErrorBoundary>;
}
function LeaguesWithBoundary() {
  return <ScreenErrorBoundary><LeaguesNavigator /></ScreenErrorBoundary>;
}
function MyPicksWithBoundary() {
  return <ScreenErrorBoundary><MyPicksScreen /></ScreenErrorBoundary>;
}
function ProfileWithBoundary() {
  return <ScreenErrorBoundary><ProfileNavigator /></ScreenErrorBoundary>;
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
      <Tab.Screen name="Home" component={HomeWithBoundary} />
      <Tab.Screen name="Live" component={LiveWithBoundary} />
      <Tab.Screen name="Leagues" component={LeaguesWithBoundary} />
      <Tab.Screen name="MyPicks" component={MyPicksWithBoundary} />
      <Tab.Screen name="Profile" component={ProfileWithBoundary} />
    </Tab.Navigator>
  );
}

// ─── Sport Selection Wrapper ─────────────────────────────
function SportSelectionWrapper({ navigation }: any) {
  const handleComplete = useCallback((selectedSports: string[]) => {
    navigation.replace('TeamSelection', { selectedSports });
  }, [navigation]);

  return <SportSelectionScreen onComplete={handleComplete} />;
}

// ─── Team Selection Wrapper ──────────────────────────────
function TeamSelectionWrapper({ navigation, route }: any) {
  const selectedSports: string[] = route?.params?.selectedSports || ['football'];

  // After picking teams we route to notification setup before the attribution step.
  const handleComplete = useCallback((data: { sports: string[]; favoriteTeams: OnboardingFavoriteTeam[]; favoriteLeagues?: OnboardingFavoriteLeague[]; favoriteDrivers?: any[] }) => {
    navigation.replace('NotificationSetup', {
      sports: data.sports,
      favoriteTeams: data.favoriteTeams,
      favoriteLeagues: data.favoriteLeagues,
    });
  }, [navigation]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('SportSelection');
    }
  }, [navigation]);

  return <TeamSelectionScreen selectedSports={selectedSports as any} onComplete={handleComplete} onBack={handleBack} />;
}

// ─── Notification Setup Wrapper ──────────────────────────
function NotificationSetupWrapper({ navigation, route }: any) {
  const sports: string[] = route?.params?.sports || [];
  const favoriteTeams: OnboardingFavoriteTeam[] = route?.params?.favoriteTeams || [];
  const favoriteLeagues: OnboardingFavoriteLeague[] | undefined = route?.params?.favoriteLeagues;

  const handleComplete = useCallback(
    (result: NotificationSetupResult) => {
      navigation.replace('AcquisitionSource', {
        sports,
        favoriteTeams,
        favoriteLeagues,
        permissionGranted: result.permissionGranted,
        notificationScope: result.scope,
        notificationTypes: {
          gameStart: result.gameStart,
          liveScores: result.liveScores,
          gameEnd: result.gameEnd,
          predictionResults: result.predictionResults,
        },
      });
    },
    [navigation, sports, favoriteTeams, favoriteLeagues],
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('TeamSelection', { selectedSports: sports });
    }
  }, [navigation, sports]);

  const hasFavorites = favoriteTeams.length > 0 || (favoriteLeagues?.length ?? 0) > 0;

  return (
    <NotificationSetupScreen
      onComplete={handleComplete}
      onBack={handleBack}
      hasFavorites={hasFavorites}
    />
  );
}

// ─── Acquisition Source Wrapper ──────────────────────────
// Forwards the user's selection (or null on skip) through to
// OnboardingCompleteScreen, which issues the actual API call.
function AcquisitionSourceWrapper({ navigation, route }: any) {
  const sports: string[] = route?.params?.sports || [];
  const favoriteTeams: OnboardingFavoriteTeam[] = route?.params?.favoriteTeams || [];
  const favoriteLeagues: OnboardingFavoriteLeague[] | undefined = route?.params?.favoriteLeagues;
  const permissionGranted = route?.params?.permissionGranted;
  const notificationScope = route?.params?.notificationScope;
  const notificationTypes = route?.params?.notificationTypes;

  const handleComplete = useCallback(
    (source: AcquisitionSourceKey | null) => {
      navigation.replace('OnboardingComplete', {
        sports,
        favoriteTeams,
        favoriteLeagues,
        acquisitionSource: source,
        permissionGranted,
        notificationScope,
        notificationTypes,
      });
    },
    [navigation, sports, favoriteTeams, favoriteLeagues, permissionGranted, notificationScope, notificationTypes],
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return <AcquisitionSourceScreen onComplete={handleComplete} onBack={handleBack} />;
}

// ─── Onboarding Complete Wrapper ─────────────────────────
function OnboardingCompleteWrapper({ navigation, route }: any) {
  const sports = route?.params?.sports || [];
  const favoriteTeams = route?.params?.favoriteTeams || [];
  const favoriteLeagues: OnboardingFavoriteLeague[] | undefined = route?.params?.favoriteLeagues;
  const acquisitionSource: AcquisitionSourceKey | null = route?.params?.acquisitionSource ?? null;
  const permissionGranted = route?.params?.permissionGranted;
  const notificationScope = route?.params?.notificationScope;
  const notificationTypes = route?.params?.notificationTypes;

  const handleComplete = useCallback(() => {
    navigation.replace('Main');
  }, [navigation]);

  return (
    <OnboardingCompleteScreen
      sports={sports}
      favoriteTeams={favoriteTeams}
      favoriteLeagues={favoriteLeagues}
      acquisitionSource={acquisitionSource}
      permissionGranted={permissionGranted}
      notificationScope={notificationScope}
      notificationTypes={notificationTypes}
      onComplete={handleComplete}
    />
  );
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

  // Deep-link referral capture: kinetic://r/<code> and
  // https://kineticapp.ca/r/<code>. We stash the code into AsyncStorage
  // and let the onboarding-complete flow auto-apply after signup.
  // Signed-in users who tap the link go straight to Referrals.
  useEffect(() => {
    const extract = (url: string | null): string | null => {
      if (!url) return null;
      const m = url.match(/\/r\/([A-Za-z0-9]+)/);
      return m ? m[1].toUpperCase() : null;
    };
    const handle = async (url: string | null) => {
      const code = extract(url);
      if (!code) return;
      try {
        const { pendingReferral } = await import('../services/referralPending');
        await pendingReferral.set(code);
      } catch {
        /* noop */
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (ev) => handle(ev.url));
    return () => sub.remove();
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

  const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [Linking.createURL('/'), 'https://kineticapp.ca'],
    config: {
      screens: {
        Main: {
          screens: {
            Leagues: {
              screens: {
                CoinLeagueDetail: 'league/:leagueId',
                JoinLeague: 'join/:inviteCode',
              },
            },
          },
        },
      },
    },
  };

  if (isLoading || (isAuthenticated && onboardingDone === null)) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking} onStateChange={onNavigationStateChange}>
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
                name="NotificationPreferences"
                component={NotificationPreferencesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="SportNotificationPreferences"
                component={SportNotificationPreferencesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="Paywall"
                component={PaywallScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
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
                name="SportSelection"
                component={SportSelectionWrapper}
                options={{ animation: 'fade' }}
              />
              <RootStack.Screen
                name="TeamSelection"
                component={TeamSelectionWrapper}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="NotificationSetup"
                component={NotificationSetupWrapper}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="AcquisitionSource"
                component={AcquisitionSourceWrapper}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="OnboardingComplete"
                component={OnboardingCompleteWrapper}
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
                name="NotificationPreferences"
                component={NotificationPreferencesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="SportNotificationPreferences"
                component={SportNotificationPreferencesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="Paywall"
                component={PaywallScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
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
