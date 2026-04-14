import './src/i18n';
import i18n from './src/i18n';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { PurchasesProvider } from './src/contexts/PurchasesContext';
import { CoinProvider } from './src/contexts/CoinContext';
import { LiveGamesProvider } from './src/contexts/LiveGamesContext';
import { AchievementProvider } from './src/contexts/AchievementContext';
import { AdProvider } from './src/contexts/AdContext';
import { RewardsProvider } from './src/contexts/RewardsContext';
import { RewardTierCelebration } from './src/components/RewardTierCelebration';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ToastConfig';
import { OfflineBanner } from './src/components/OfflineBanner';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log('AppErrorBoundary caught:', error, info.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>!</Text>
          <Text style={errorStyles.title}>{i18n.t('error.title')}</Text>
          <Text style={errorStyles.message}>
            {i18n.t('error.message')}
          </Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={this.handleRestart}
            activeOpacity={0.8}
          >
            <Text style={errorStyles.buttonText}>{i18n.t('error.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E11',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 16,
    width: 72,
    height: 72,
    lineHeight: 72,
    textAlign: 'center',
    borderRadius: 36,
    backgroundColor: 'rgba(220,38,38,0.12)',
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: '#F8F9FE',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: 'rgba(248,249,254,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#CAFD00',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  buttonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#0B0E11',
    letterSpacing: 1,
  },
});

export default function App() {
  // ── Android navigation bar color ──────────────────────────────────────────
  // Required on Android 15+ (edge-to-edge enforcement). Sets the bottom
  // navigation bar (home/back buttons) to the same dark background as the app.
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#0B0E11');
      NavigationBar.setButtonStyleAsync('light');
    }
  }, []);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
    ...FontAwesome5.font,
    ...MaterialIcons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#CAFD00" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <PurchasesProvider>
            <AdProvider>
            <CoinProvider>
              <LiveGamesProvider>
                <AchievementProvider>
                  <RewardsProvider>
                    <StatusBar style="light" />
                    <AppNavigator />
                    <OfflineBanner />
                    <RewardTierCelebration />
                    <Toast config={toastConfig} topOffset={60} />
                  </RewardsProvider>
                </AchievementProvider>
              </LiveGamesProvider>
            </CoinProvider>
            </AdProvider>
          </PurchasesProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0B0E11',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
