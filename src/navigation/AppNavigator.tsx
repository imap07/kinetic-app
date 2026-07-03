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
  MyPicksStackParamList,
  OnboardingFavoriteTeam,
  OnboardingFavoriteLeague,
} from './types';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchasesContext';
import { BirthdateReminderModal } from '../components/BirthdateReminderModal';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useDailyOpenCheckIn } from '../hooks/useDailyOpenCheckIn';
import { useSessionTracking } from '../hooks/useSessionTracking';
import { colors } from '../theme';
import { ONBOARDING_COMPLETE_KEY } from '../utils/onboarding';
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
import { WalletRewardsScreen } from '../screens/WalletRewardsScreen';
import { LeagueDetailScreen } from '../screens/LeagueDetailScreen';
import { CustomTabBar } from '../components/CustomTabBar';
import { SearchScreen } from '../screens/SearchScreen';
// LeagueSelectionScreen removed from onboarding V2 flow
import { logScreenView } from '../services/analytics';
import { navigationRef } from './navigationRef';
import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';
import { markReady } from '../utils/perfMarks';

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
      <HomeStack.Screen name="F1RacePrediction" getComponent={() => require('../screens/F1RacePredictionScreen').default} />
      <HomeStack.Screen name="PickSummary" component={PickSummaryScreen} />
      <HomeStack.Screen name="Quests" getComponent={() => require('../screens/QuestsScreen').QuestsScreen} />
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
      <LiveStack.Screen name="LiveF1RacePrediction" getComponent={() => require('../screens/F1RacePredictionScreen').default} />
      <LiveStack.Screen name="LivePickSummary" component={PickSummaryScreen} />
    </LiveStack.Navigator>
  );
}

// ─── Leagues Stack (Leagues tab) ─────────────────────────
const LeaguesStack = createNativeStackNavigator<LeaguesStackParamList>();

function LeaguesNavigator() {
  return (
    <LeaguesStack.Navigator screenOptions={darkScreenOptions}>
      <LeaguesStack.Screen name="LeaguesHome" getComponent={() => require('../screens/CoinLeaguesScreen').CoinLeaguesScreen} />
      <LeaguesStack.Screen name="CoinLeagueDetail" getComponent={() => require('../screens/CoinLeagueDetailScreen').CoinLeagueDetailScreen} />
      <LeaguesStack.Screen name="LeaguePicksFeed" getComponent={() => require('../screens/LeaguePicksFeedScreen').LeaguePicksFeedScreen} />
      <LeaguesStack.Screen name="LeagueMatchPrediction" component={MatchPredictionScreen} />
      <LeaguesStack.Screen name="LeagueF1RacePrediction" getComponent={() => require('../screens/F1RacePredictionScreen').default} />
      <LeaguesStack.Screen name="LeaguePickSummary" component={PickSummaryScreen} />
      <LeaguesStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <LeaguesStack.Screen name="QRScanner" getComponent={() => require('../screens/QRScannerScreen').QRScannerScreen} />
      <LeaguesStack.Screen name="JoinLeague" getComponent={() => require('../screens/JoinLeagueScreen').JoinLeagueScreen} />
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
      <ProfileStack.Screen name="EditFavoriteSports" getComponent={() => require('../screens/EditFavoriteSportsScreen').EditFavoriteSportsScreen} />
      <ProfileStack.Screen name="EditFavoriteLeagues" getComponent={() => require('../screens/EditFavoriteLeaguesScreen').EditFavoriteLeaguesScreen} />
      <ProfileStack.Screen name="EditFavoriteTeams" getComponent={() => require('../screens/EditFavoriteTeamsScreen').EditFavoriteTeamsScreen} />
      <ProfileStack.Screen name="ChangePassword" getComponent={() => require('../screens/ChangePasswordScreen').ChangePasswordScreen} />
      {/* Notifications screens live ONLY in the root stack (bell icon reaches
          them from any tab); navigate() calls from Profile climb up to it. */}
      <ProfileStack.Screen name="SecurityPrivacy" getComponent={() => require('../screens/SecurityPrivacyScreen').SecurityPrivacyScreen} />
      <ProfileStack.Screen name="WalletRewards" component={WalletRewardsScreen} />
      <ProfileStack.Screen name="CoinStore" getComponent={() => require('../screens/CoinStoreScreen').CoinStoreScreen} />
      <ProfileStack.Screen name="GiftcardRedeem" getComponent={() => require('../screens/GiftcardRedeemScreen').GiftcardRedeemScreen} />
      <ProfileStack.Screen name="StreakLeaderboard" getComponent={() => require('../screens/StreakLeaderboardScreen').StreakLeaderboardScreen} />
      <ProfileStack.Screen name="FriendsLeaderboard" getComponent={() => require('../screens/FriendsLeaderboardScreen').FriendsLeaderboardScreen} />
      <ProfileStack.Screen name="Rivalries" getComponent={() => require('../screens/RivalriesScreen').RivalriesScreen} />
      <ProfileStack.Screen name="Seasons" getComponent={() => require('../screens/SeasonsScreen').SeasonsScreen} />
      <ProfileStack.Screen name="Cosmetics" getComponent={() => require('../screens/CosmeticsScreen').CosmeticsScreen} />
      <ProfileStack.Screen name="Referrals" getComponent={() => require('../screens/ReferralsScreen').ReferralsScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── MyPicks Stack (MyPicks tab) ──────────────────────────
const MyPicksStack = createNativeStackNavigator<MyPicksStackParamList>();

function MyPicksNavigator() {
  return (
    <MyPicksStack.Navigator screenOptions={darkScreenOptions}>
      <MyPicksStack.Screen name="MyPicksHome" component={MyPicksScreen} />
    </MyPicksStack.Navigator>
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
  return <ScreenErrorBoundary><MyPicksNavigator /></ScreenErrorBoundary>;
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

// One-time, dismissible Pro paywall shown the first time a user finishes
// onboarding. Highest-impression placement per RevenueCat data; kept as a
// soft offer (never a gate) to stay consistent with Kinetic's fully-open
// model — the RC paywall always renders its close button.
const POST_ONBOARDING_PAYWALL_KEY = 'post_onboarding_paywall_shown';

// ─── Onboarding Complete Wrapper ─────────────────────────
function OnboardingCompleteWrapper({ navigation, route }: any) {
  const { isProMember, presentPaywall } = usePurchases();
  const sports = route?.params?.sports || [];
  const favoriteTeams = route?.params?.favoriteTeams || [];
  const favoriteLeagues: OnboardingFavoriteLeague[] | undefined = route?.params?.favoriteLeagues;
  const acquisitionSource: AcquisitionSourceKey | null = route?.params?.acquisitionSource ?? null;
  const permissionGranted = route?.params?.permissionGranted;
  const notificationScope = route?.params?.notificationScope;
  const notificationTypes = route?.params?.notificationTypes;

  const handleComplete = useCallback(async () => {
    navigation.replace('Main');
    // Show the post-onboarding paywall once, and never to an existing Pro.
    // The flag lives in AsyncStorage so it persists across JS reloads and
    // backgrounding; it only clears on uninstall — and a fresh install is
    // effectively a new onboarding, so showing it again is intended.
    try {
      if (isProMember) return;
      const alreadyShown = await AsyncStorage.getItem(POST_ONBOARDING_PAYWALL_KEY);
      if (alreadyShown) return;
      await AsyncStorage.setItem(POST_ONBOARDING_PAYWALL_KEY, 'true');
      await presentPaywall('post_onboarding');
    } catch {
      /* best-effort — never block the user from reaching the app */
    }
  }, [navigation, isProMember, presentPaywall]);

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

/**
 * Walk the nav state to the leaf route and return its params so the
 * screen_view event can carry sport/league/game context. Many of our
 * screens already pass `{ sport, gameApiId, leagueApiId }` via
 * navigation.navigate(...) — this just plumbs that through to the
 * analytics sink so dashboards can segment per-sport without needing
 * a code change at every screen.
 */
function getActiveRouteParams(
  state: NavigationState | undefined,
): Record<string, any> | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteParams(route.state as NavigationState);
  return (route.params as Record<string, any> | undefined) ?? undefined;
}

export function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  // Daily app-open check-in fires on mount + every foreground.
  // Mounted here (rather than in App.tsx) because the hook needs
  // both AuthContext and CoinContext, and both are providers
  // wrapping AppNavigator.
  useDailyOpenCheckIn();
  // Session + lifecycle telemetry. Gated on isAuthenticated so we
  // don't double-track the "logged out" launch as a real session.
  useSessionTracking(!!user);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  const onNavigationStateChange = useCallback((state: NavigationState | undefined) => {
    const currentRouteName = getActiveRouteName(state);
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      // Extract optional sport/league/game from the leaf route's params
      // (e.g. MatchPrediction is navigated with { sport, gameApiId }).
      // Unknown shapes pass through harmlessly — logScreenView strips
      // anything that isn't a primitive.
      const params = getActiveRouteParams(state);
      const sport = typeof params?.sport === 'string' ? params.sport : undefined;
      const leagueApiId =
        typeof params?.leagueApiId === 'number' ? params.leagueApiId : undefined;
      const gameApiId =
        typeof params?.gameApiId === 'number'
          ? params.gameApiId
          : typeof params?.fixtureApiId === 'number'
            ? params.fixtureApiId
            : typeof params?.raceApiId === 'number'
              ? params.raceApiId
              : undefined;
      logScreenView(currentRouteName, undefined, { sport, leagueApiId, gameApiId });
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
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={() => markReady('navigator-ready')}
      onStateChange={onNavigationStateChange}
    >
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
                getComponent={() => require('../screens/NotificationPreferencesScreen').NotificationPreferencesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="SportNotificationPreferences"
                getComponent={() => require('../screens/SportNotificationPreferencesScreen').SportNotificationPreferencesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="Search"
                component={SearchScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal', headerShown: false }}
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
                getComponent={() => require('../screens/NotificationPreferencesScreen').NotificationPreferencesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="SportNotificationPreferences"
                getComponent={() => require('../screens/SportNotificationPreferencesScreen').SportNotificationPreferencesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <RootStack.Screen
                name="Search"
                component={SearchScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal', headerShown: false }}
              />
            </>
          )
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
      {isAuthenticated && <BirthdateReminderModal />}
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
