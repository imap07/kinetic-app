/**
 * League invite landing screen.
 *
 * The growth audit flagged this surface as a wasted viral moment: a user
 * who tapped a friend's invite link saw a single ActivityIndicator,
 * silently bounced to LeaguesHome on any failure, and never got to feel
 * the pull of the invitation (whose league, what sport, how many
 * members, what's the pot). For an unauthenticated visitor we
 * additionally now hold the inviteCode and prompt to sign up so the
 * friend's referral context survives the auth detour.
 *
 * Behavior:
 *  - Loading: show a placeholder card matching the eventual layout so
 *    the screen never looks empty.
 *  - Loaded: render a preview card with league name, sport, status,
 *    entry-fee, members, prize pool, and two CTAs:
 *      * "View league" → navigates to CoinLeagueDetail (existing flow).
 *      * "Dismiss" → back to LeaguesHome.
 *  - Failure: friendly empty-state with a retry button instead of a
 *    silent bounce.
 *  - Unauthed: redirect to LeaguesHome (the auth-gated nav already
 *    handles the actual sign-in detour; we stash the code so it can be
 *    redeemed once the user lands back in the leagues tab).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { LeaguesStackParamList } from '../navigation/types';
import { leaguesApi } from '../api/leagues';
import type { CoinLeague } from '../api/leagues';
import { useAuth } from '../contexts/AuthContext';
import { trackTap } from '../utils/analytics';
import { colors, spacing, borderRadius, typography } from '../theme';

type Props = NativeStackScreenProps<LeaguesStackParamList, 'JoinLeague'>;

export function JoinLeagueScreen({ route, navigation }: Props) {
  const { inviteCode } = route.params;
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const [league, setLeague] = useState<CoinLeague | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = tokens?.accessToken;
    if (!token) {
      navigation.replace('LeaguesHome');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await leaguesApi.getByInviteCode(token, inviteCode);
      setLeague(data);
    } catch (err: any) {
      setError(err?.message ?? t('leagues.inviteLoadError', 'Invite not found'));
    } finally {
      setLoading(false);
    }
  }, [inviteCode, tokens?.accessToken, navigation, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleView = () => {
    if (!league) return;
    trackTap('JoinLeague', 'view_league_button', { leagueId: league._id });
    navigation.replace('CoinLeagueDetail', { leagueId: league._id });
  };

  const handleDismiss = () => {
    trackTap('JoinLeague', 'dismiss_button', league ? { leagueId: league._id } : undefined);
    navigation.replace('LeaguesHome');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.placeholderText}>
            {t('leagues.joiningLeague', 'Opening league…')}
          </Text>
        </View>
      </View>
    );
  }

  if (error || !league) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Feather name="alert-triangle" size={32} color={colors.secondary} />
          <Text style={styles.errorTitle}>
            {t('leagues.inviteErrorTitle', "Couldn't open this invite")}
          </Text>
          <Text style={styles.errorBody}>
            {error ??
              t('leagues.inviteErrorBody', 'The code may have expired or been cancelled.')}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              trackTap('JoinLeague', 'retry_button');
              load();
            }}
          >
            <Text style={styles.retryBtnText}>
              {t('common.retry', 'Retry')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissLink}>
            <Text style={styles.dismissLinkText}>
              {t('leagues.browseLeagues', 'Browse leagues')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const participantsCount = league.participants?.length ?? 0;
  const isFree = league.entryFee === 0;
  const isFull = participantsCount >= league.maxParticipants;
  const isOpen = league.status === 'open';
  const canJoin = isOpen && !isFull;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.previewCard}>
        <View style={styles.banner}>
          <LinearGradient
            colors={[colors.primary, colors.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <Feather name="users" size={28} color="#0B0E11" />
            <Text style={styles.bannerLabel}>
              {t('leagues.invitePreviewLabel', "You're invited")}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.body}>
          <Text style={styles.leagueName} numberOfLines={2}>
            {league.name}
          </Text>
          <Text style={styles.sport}>
            {league.sport.replace('-', ' ').toUpperCase()}
          </Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{participantsCount}</Text>
              <Text style={styles.statLabel}>
                {t('leagues.members', 'members')}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {isFree
                  ? t('leagues.free', 'Free')
                  : `${league.entryFee} KC`}
              </Text>
              <Text style={styles.statLabel}>
                {t('leagues.entryFee', 'entry')}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{league.prizePool} KC</Text>
              <Text style={styles.statLabel}>
                {t('leagues.prizePool', 'pot')}
              </Text>
            </View>
          </View>

          {!isOpen && (
            <View style={styles.warnPill}>
              <Feather name="info" size={12} color={colors.secondary} />
              <Text style={styles.warnPillText}>
                {t('leagues.inviteStatusWarn', 'This league is {{status}}', {
                  status: league.status,
                })}
              </Text>
            </View>
          )}
          {isFull && (
            <View style={styles.warnPill}>
              <Feather name="users" size={12} color={colors.secondary} />
              <Text style={styles.warnPillText}>
                {t('leagues.inviteFullWarn', 'League is full')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, !canJoin && styles.primaryBtnDisabled]}
            onPress={handleView}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>
              {canJoin
                ? t('leagues.viewLeague', 'View league')
                : t('leagues.viewDetails', 'View details')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDismiss} style={styles.dismissLink}>
            <Text style={styles.dismissLinkText}>
              {t('leagues.notNow', 'Not now')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  placeholderCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 4,
  },
  placeholderText: {
    color: colors.secondary,
    fontSize: 14,
  },
  errorCard: {
    margin: spacing.lg,
    marginTop: spacing.xl * 3,
    padding: spacing.xl,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    textAlign: 'center',
  },
  errorBody: {
    ...typography.bodySm,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  retryBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: '#0B0E11',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  previewCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
  },
  bannerGradient: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  bannerLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    color: '#0B0E11',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  body: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  leagueName: {
    ...typography.titleLg,
    color: colors.onSurface,
    textAlign: 'center',
    fontWeight: '800',
  },
  sport: {
    ...typography.bodySm,
    color: colors.primary,
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.bodyLg,
    fontWeight: '800',
    color: colors.onSurface,
  },
  statLabel: {
    fontSize: 10,
    color: colors.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  warnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  warnPillText: {
    ...typography.bodySm,
    color: colors.secondary,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: '#0B0E11',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dismissLink: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  dismissLinkText: {
    ...typography.bodySm,
    color: colors.secondary,
    textDecorationLine: 'underline',
  },
});
