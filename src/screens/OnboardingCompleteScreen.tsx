import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { track } from '../services/analytics';
import { referralsApi, buildReferralUrl, type ReferralStatus } from '../api/referrals';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { authApi, notificationsApi } from '../api';
import type { SportKey } from '../api/sports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETE_KEY } from './OnboardingScreen';
import type { AcquisitionSourceKey } from './AcquisitionSourceScreen';
import type { OnboardingFavoriteTeam, OnboardingFavoriteLeague } from '../navigation/types';

type FavoriteTeam = OnboardingFavoriteTeam;

interface Props {
  sports: SportKey[];
  favoriteTeams: FavoriteTeam[];
  favoriteLeagues?: OnboardingFavoriteLeague[];
  // Null when the user skipped the "How did you hear about us?" step.
  acquisitionSource?: AcquisitionSourceKey | null;
  // Whether the user granted push notification permission during onboarding
  permissionGranted?: boolean;
  // Notification preferences from the onboarding setup screen
  notificationScope?: 'my_teams' | 'all_games';
  notificationTypes?: {
    gameStart: boolean;
    liveScores: boolean;
    gameEnd: boolean;
    predictionResults: boolean;
  };
  onComplete: () => void;
}

const SPORT_LABELS: Record<string, string> = {
  football: 'Soccer',
  basketball: 'Basketball',
  hockey: 'Hockey',
  'american-football': 'Football',
  baseball: 'Baseball',
  'formula-1': 'F1',
  afl: 'AFL',
  handball: 'Handball',
  rugby: 'Rugby',
  volleyball: 'Volleyball',
  mma: 'MMA',
};

export function OnboardingCompleteScreen({
  sports,
  favoriteTeams,
  favoriteLeagues,
  acquisitionSource,
  permissionGranted,
  notificationScope,
  notificationTypes,
  onComplete,
}: Props) {
  const { tokens, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [referral, setReferral] = useState<ReferralStatus | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    referralsApi.getStatus(tokens.accessToken).then(setReferral).catch(() => {});
  }, [tokens?.accessToken]);

  const handleInvite = useCallback(async () => {
    if (!referral?.code) return;
    const url = buildReferralUrl(referral.code);
    const message = t('referrals.shareMessage', {
      url,
      coins: referral.rewardCoins,
      code: referral.code,
    });
    try {
      const res = await Share.share({ message, url });
      if (res.action === Share.sharedAction) {
        track({ event: 'referral_invited', channel: 'onboarding' });
      }
    } catch {}
  }, [referral, t]);

  const handleLetsGo = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setSaving(true);

    let onboardingSuccess = false;
    let onboardingError: unknown = null;
    try {
      await authApi.completeOnboarding(tokens.accessToken, {
        sports,
        favoriteTeams: favoriteTeams.map((ft) => ({
          teamApiId: ft.teamApiId,
          sport: ft.sport,
          teamName: ft.teamName,
          teamLogo: ft.teamLogo,
          leagueApiId: ft.leagueApiId,
          leagueName: ft.leagueName,
        })),
        // Only send favoriteLeagues when the user actually picked some —
        // avoids sending an empty array to old backends that might not
        // whitelist the field yet (the DTO accepts it, but `undefined`
        // keeps the payload minimal).
        ...(favoriteLeagues && favoriteLeagues.length > 0
          ? {
              favoriteLeagues: favoriteLeagues.map((fl) => ({
                leagueApiId: fl.leagueApiId,
                sport: fl.sport,
                leagueName: fl.leagueName,
              })),
            }
          : {}),
        ...(acquisitionSource ? { acquisitionSource } : {}),
      });
      onboardingSuccess = true;
    } catch (err) {
      onboardingError = err;
      console.warn('[Onboarding] completeOnboarding failed:', err);
    }

    // Save notification preferences (best-effort)
    if (notificationScope || notificationTypes) {
      try {
        await notificationsApi.updatePreferences(tokens.accessToken, {
          enabled: permissionGranted ?? false,
          ...(notificationScope ? { notificationScope } : {}),
          ...(notificationTypes ? { types: notificationTypes } : {}),
        });
      } catch (err) {
        console.warn('[Onboarding] notification preferences save failed:', err);
      }
    }

    // Belt-and-suspenders for attribution
    if (acquisitionSource) {
      try {
        await authApi.setAcquisitionSource(tokens.accessToken, acquisitionSource);
      } catch {
        // Attribution is best-effort
      }
    }

    if (onboardingSuccess) {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    }

    // Auto-apply pending referral code captured from deep link (best-effort).
    // Consumes the stash regardless of outcome — invalid/used codes
    // shouldn't pester the user on every app open.
    try {
      const { pendingReferral } = await import('../services/referralPending');
      const pending = await pendingReferral.get();
      if (pending) {
        try {
          const { referralsApi } = await import('../api/referrals');
          await referralsApi.apply(tokens.accessToken, pending);
        } catch (err) {
          console.warn('[Onboarding] referral apply failed:', err);
        } finally {
          await pendingReferral.clear();
        }
      }
    } catch {
      /* noop */
    }

    try { await refreshProfile(); } catch {}
    setSaving(false);

    // If the onboarding POST failed the user's preferences never persisted.
    // Previously this error was swallowed and the user landed inside the
    // app with `onboardingCompleted: false` and empty favoriteTeams — the
    // exact condition that left existing users with broken notifications.
    // Surface it so they know to retry instead of silently shipping them on.
    if (!onboardingSuccess) {
      const message =
        (onboardingError as any)?.message ||
        'We couldn\'t save your picks. Please try again.';
      Alert.alert(
        'Setup incomplete',
        message,
        [
          { text: 'Try again', onPress: () => {} },
        ],
        { cancelable: true },
      );
      return;
    }

    onComplete();
  }, [tokens?.accessToken, sports, favoriteTeams, favoriteLeagues, acquisitionSource, permissionGranted, notificationScope, notificationTypes, onComplete, refreshProfile]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Checkmark */}
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={64} color="#5BEF90" />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {t('onboardingComplete.title', "You're all set!")}
        </Text>
        <Text style={styles.subtitle}>
          {t('onboardingComplete.subtitle', 'Your personalized feed is ready')}
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="football" size={20} color={colors.primary} />
            <Text style={styles.summaryText}>
              {sports.length} {sports.length === 1 ? 'sport' : 'sports'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Ionicons name="heart" size={20} color={colors.primary} />
            <Text style={styles.summaryText}>
              {favoriteTeams.length} {favoriteTeams.length === 1 ? 'team' : 'teams'} selected
            </Text>
          </View>
          {favoriteLeagues && favoriteLeagues.length > 0 && (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="trophy" size={20} color={colors.primary} />
                <Text style={styles.summaryText}>
                  {favoriteLeagues.length} {favoriteLeagues.length === 1 ? 'league' : 'leagues'} selected
                </Text>
              </View>
            </>
          )}
          {notificationScope && (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
                <Text style={styles.summaryText}>
                  {notificationScope === 'my_teams'
                    ? t('onboardingComplete.notifMyTeams', 'Notifications: My Teams')
                    : t('onboardingComplete.notifAllGames', 'Notifications: All Games')}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Sport pills */}
        <View style={styles.sportPills}>
          {sports.map((sport) => (
            <View key={sport} style={styles.sportPill}>
              <Text style={styles.sportPillText}>{SPORT_LABELS[sport] || sport}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        {referral?.code && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleInvite}
            disabled={saving}
            style={styles.inviteBtn}
          >
            <Ionicons name="gift-outline" size={16} color={colors.primary} />
            <Text style={styles.inviteText}>
              {t('onboardingComplete.inviteFriends', {
                defaultValue: 'Invite a friend — earn {{coins}} coins',
                coins: referral.rewardCoins,
              })}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleLetsGo}
          disabled={saving}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={['#E8FF8A', '#CAFD00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#4A5E00" />
            ) : (
              <Text style={styles.ctaText}>
                {t('onboardingComplete.letsGo', "Let's Go")}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(91,239,144,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 8,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.outline,
  },
  sportPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  sportPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
  },
  sportPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 10,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 10,
  },
  inviteText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.primary,
  },
  ctaWrap: { borderRadius: 14, overflow: 'hidden' },
  ctaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: '#3A4A00',
    letterSpacing: 1.2,
  },
});
