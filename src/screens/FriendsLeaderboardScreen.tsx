/**
 * Friends Streak Leaderboard.
 *
 * Pulls the viewer's mutual-referral graph from GET
 * /streaks/friends-leaderboard and ranks everyone by current
 * streak. Built specifically to make the streak loop social
 * without exposing strangers — the only people on this board are
 * users this user has invited or been invited by.
 *
 * Empty state (zero friends) renders the viewer's own row + a
 * prominent "Invite a friend" CTA that routes to the Referrals
 * screen. That's the whole point of this surface: turn one's
 * streak progress into a reason to invite.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { colors, spacing } from '../theme';
import { streaksApi } from '../api/streaks';
import { useAuth } from '../contexts/AuthContext';
import { AdBanner } from '../components/AdBanner';

interface Entry {
  userId: string;
  displayName: string;
  avatar: string | null;
  tier: string;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  isMe: boolean;
}

export function FriendsLeaderboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { tokens } = useAuth();

  const [board, setBoard] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const data = await streaksApi.getFriendsLeaderboard(tokens.accessToken);
      setBoard(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const aloneOnBoard = board.length === 1 && board[0].isMe;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('friendsLeaderboard.title', { defaultValue: 'Friends Streaks' })}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={board}
          keyExtractor={(e) => e.userId}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            aloneOnBoard ? null : (
              <Text style={styles.subTitle}>
                {t('friendsLeaderboard.subtitle', {
                  defaultValue: 'You and the friends you connected with.',
                })}
              </Text>
            )
          }
          renderItem={({ item, index }) => (
            <View
              style={[styles.row, item.isMe && styles.rowMe]}
            >
              <Text style={[styles.rank, item.isMe && styles.rankMe]}>
                #{index + 1}
              </Text>
              {item.avatar ? (
                <ExpoImage
                  source={{ uri: item.avatar }}
                  style={styles.avatar}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {item.displayName?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.name, item.isMe && styles.nameMe]}
                  numberOfLines={1}
                >
                  {item.displayName}
                  {item.isMe ? ` ${t('common.you')}` : ''}
                </Text>
                <Text style={styles.tier}>{item.tier.toUpperCase()}</Text>
              </View>
              <View style={styles.streakBlock}>
                <Ionicons name="flame" size={14} color={colors.primary} />
                <Text style={styles.streakValue}>{item.currentStreak}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            aloneOnBoard ? (
              <View style={styles.emptyFooter}>
                <Text style={styles.emptyTitle}>
                  {t('friendsLeaderboard.aloneTitle', {
                    defaultValue: 'No friends yet',
                  })}
                </Text>
                <Text style={styles.emptyBody}>
                  {t('friendsLeaderboard.aloneBody', {
                    defaultValue:
                      'Invite a friend to compete on streaks. Both of you earn coins when they qualify.',
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.cta}
                  onPress={() => navigation.navigate('Referrals')}
                  activeOpacity={0.85}
                >
                  <Feather name="gift" size={14} color={colors.onPrimary} />
                  <Text style={styles.ctaText}>
                    {t('friendsLeaderboard.inviteCta', {
                      defaultValue: 'Invite a friend',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
      <AdBanner placement="friends_leaderboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  subTitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowMe: {
    backgroundColor: 'rgba(202,253,0,0.06)',
  },
  rank: {
    width: 30,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  rankMe: { color: colors.primary },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: 'rgba(202,253,0,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  nameMe: { color: colors.primary },
  tier: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  streakBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },

  emptyFooter: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  emptyBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.onPrimary,
  },
});
