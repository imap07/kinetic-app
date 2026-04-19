/**
 * Public Streak Leaderboard.
 *
 * Displays the top 50 current streaks across all users with
 * `publicProfile: true`. Lives in the Profile stack (settings-adjacent)
 * and is linked from the profile hero's streak row.
 *
 * Design
 * ------
 * The leaderboard is meant to be glanceable: one row per user, rank +
 * avatar + name + tier pill + streak count. The current user's own
 * row is highlighted with the primary lime accent so they can see
 * their position at a scroll.
 *
 * The endpoint is public (no auth required) but we still fetch via
 * the apiClient so when the user IS logged in we can cross-reference
 * `userId === me` for highlighting. Anonymous visitors land on the
 * same list without personalization.
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
import { colors } from '../theme';
import { streaksApi } from '../api/streaks';
import type { StreakLeaderboardEntry } from '../api/streaks';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from '../components/Skeleton';

export function StreakLeaderboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [entries, setEntries] = useState<StreakLeaderboardEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await streaksApi.getLeaderboard();
      setEntries(res.board);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const myId = (user as any)?.id || (user as any)?._id;
  const myIdStr = myId ? String(myId) : null;

  const renderItem = ({ item }: { item: StreakLeaderboardEntry }) => {
    const isMe = myIdStr === item.userId;
    return (
      <View style={[styles.row, isMe && styles.rowMe]}>
        <Text style={[styles.rank, isMe && styles.rankMe]}>#{item.rank}</Text>
        <View style={styles.avatar}>
          {item.avatar ? (
            <ExpoImage
              source={{ uri: item.avatar }}
              style={styles.avatarImg}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Ionicons name="person" size={16} color={colors.onSurfaceVariant} />
          )}
        </View>
        <View style={styles.namesCol}>
          <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Text style={styles.tier}>{item.tier.toUpperCase()}</Text>
        </View>
        <View style={styles.streakCol}>
          <Text style={[styles.streakNum, isMe && styles.streakNumMe]}>
            {item.currentStreak}
          </Text>
          <Text style={styles.streakLabel}>
            {t('streakBoard.days', { defaultValue: 'days' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('streakBoard.title', { defaultValue: 'STREAK BOARD' })}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {entries === null && !error ? (
        <View style={styles.listBody}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={12} style={{ marginBottom: 8 }} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.onSurfaceVariant} />
          <Text style={styles.errorText}>
            {t('streakBoard.errorLoading', {
              defaultValue: "Couldn't load the leaderboard. Pull down to retry.",
            })}
          </Text>
        </View>
      ) : entries!.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={40} color={colors.onSurfaceDim} />
          <Text style={styles.emptyTitle}>
            {t('streakBoard.emptyTitle', { defaultValue: 'No public streaks yet' })}
          </Text>
          <Text style={styles.emptyBody}>
            {t('streakBoard.emptyBody', {
              defaultValue:
                'Be the first: make picks, build a streak, and keep your profile public.',
            })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.userId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listBody}
          ListHeaderComponent={
            <Text style={styles.note}>
              {t('streakBoard.note', {
                defaultValue: 'Only shows users with a public profile.',
              })}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    letterSpacing: 1.2,
  },
  listBody: { paddingHorizontal: 16, paddingBottom: 40 },
  note: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
  },
  rowMe: {
    backgroundColor: 'rgba(202,253,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.25)',
  },
  rank: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    width: 36,
  },
  rankMe: { color: colors.primary },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 36, height: 36 },
  namesCol: { flex: 1 },
  name: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  nameMe: { color: colors.primary },
  tier: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  streakCol: { alignItems: 'flex-end' },
  streakNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: colors.onSurface,
  },
  streakNumMe: { color: colors.primary },
  streakLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  errorState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 8,
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
    lineHeight: 19,
    marginTop: 4,
  },
});
