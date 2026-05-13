/**
 * Bottom-sheet preview of another player's public profile. Mounted
 * once at the screen root and driven by a userId prop — pass `null`
 * to dismiss. Use case: tapping a member name/avatar in a league
 * picks feed or leaderboard.
 *
 * Showing concrete stats (tier, streak, win rate, last 5 picks)
 * turns abstract leaderboard rows into competitive relationships,
 * which the audit identified as the biggest cheap-win for league
 * engagement.
 *
 * Privacy is enforced server-side: 403 if the target has
 * publicProfile=false, stats omitted when showStats=false, picks
 * omitted when showHistory=false. The sheet renders whatever the
 * API returns and falls back gracefully.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usersApi, type PublicProfile } from '../api/users';
import { colors } from '../theme';

interface Props {
  userId: string | null;
  onClose: () => void;
}

export function PublicProfileSheet({ userId, onClose }: Props) {
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !tokens?.accessToken) {
      setProfile(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    usersApi
      .getPublicProfile(tokens.accessToken, userId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e: any) => {
        if (cancelled) return;
        // Map back-end status codes to friendly copy.
        const status = e?.status;
        if (status === 403) {
          setError(t('publicProfile.private', { defaultValue: 'This profile is private.' }));
        } else if (status === 404) {
          setError(t('publicProfile.notFound', { defaultValue: 'User not found.' }));
        } else {
          setError(t('common.tryAgainLater'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, tokens?.accessToken, t]);

  const winRatePct =
    profile?.stats ? Math.round(profile.stats.winRate * 100) : null;

  return (
    <Modal
      visible={!!userId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.grabber} />

          {loading && (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {!loading && error && (
            <View style={styles.center}>
              <Feather name="info" size={28} color={colors.onSurfaceVariant} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!loading && profile && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                {profile.avatar ? (
                  <ExpoImage source={{ uri: profile.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {profile.displayName?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {profile.displayName}
                  </Text>
                  <View style={styles.tierPill}>
                    <Text style={styles.tierText}>
                      {profile.tier.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {profile.stats ? (
                <View style={styles.statsRow}>
                  <Stat label={t('publicProfile.winRate', { defaultValue: 'Win rate' })} value={`${winRatePct}%`} />
                  <Stat label={t('publicProfile.streak', { defaultValue: 'Streak' })} value={`${profile.stats.currentStreak}`} />
                  <Stat label={t('publicProfile.bestStreak', { defaultValue: 'Best' })} value={`${profile.stats.bestStreak}`} />
                  <Stat
                    label={t('publicProfile.picks', { defaultValue: 'Picks' })}
                    value={`${profile.stats.correctPicks}/${profile.stats.totalPicks}`}
                  />
                </View>
              ) : (
                <Text style={styles.privateNote}>
                  {t('publicProfile.statsHidden', { defaultValue: 'Stats hidden by user.' })}
                </Text>
              )}

              {profile.recentPicks.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>
                    {t('publicProfile.recent', { defaultValue: 'Recent picks' })}
                  </Text>
                  {profile.recentPicks.map((p, i) => (
                    <View key={i} style={styles.pickRow}>
                      <View style={styles.pickResult}>
                        {p.status === 'won' ? (
                          <Feather name="check" size={14} color={colors.primary} />
                        ) : p.status === 'void' ? (
                          <Feather name="minus" size={14} color={colors.onSurfaceVariant} />
                        ) : (
                          <Feather name="x" size={14} color={colors.error} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickLine} numberOfLines={1}>
                          {p.awayTeamName} @ {p.homeTeamName}
                        </Text>
                        <Text style={styles.pickMeta}>
                          {p.sport.toUpperCase()} · {p.predictedOutcome.toUpperCase()}
                        </Text>
                      </View>
                      {p.pointsAwarded > 0 && (
                        <Text style={styles.pickPoints}>
                          +{p.pointsAwarded}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              ) : profile.stats ? (
                <Text style={styles.privateNote}>
                  {t('publicProfile.historyHidden', {
                    defaultValue: 'No history shared yet.',
                  })}
                </Text>
              ) : null}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '75%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginBottom: 16,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: {
    backgroundColor: 'rgba(202,253,0,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: colors.primary,
  },
  name: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.onSurface,
  },
  tierPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(202,253,0,0.10)',
  },
  tierText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  stat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 17,
    color: colors.onSurface,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  privateNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    paddingVertical: 16,
    textAlign: 'center',
  },

  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  pickResult: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickLine: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  pickMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  pickPoints: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.primary,
  },
});
