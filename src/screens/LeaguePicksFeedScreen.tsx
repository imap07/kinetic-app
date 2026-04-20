import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { leaguesApi, type LeaguePickFeedItem } from '../api/leagues';
import { reactionsApi } from '../api/reactions';
import type { ReactionSummary } from '../api/reactions';
import type { PickReactionKey } from '../shared/domain';
import type { LeaguesStackParamList } from '../navigation/types';
import { ReactionBar } from '../components/ReactionBar';

type RouteParams = RouteProp<LeaguesStackParamList, 'LeaguePicksFeed'>;

export function LeaguePicksFeedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { tokens } = useAuth();
  const { t } = useTranslation();

  const { leagueId, leagueName } = route.params;

  const [items, setItems] = useState<LeaguePickFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isF1Unsupported, setIsF1Unsupported] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'more') => {
      if (!tokens?.accessToken) return;
      if (mode === 'more' && (!cursor || loadingMore)) return;
      try {
        if (mode === 'initial') setLoading(true);
        if (mode === 'refresh') setRefreshing(true);
        if (mode === 'more') setLoadingMore(true);
        setError(null);
        const res = await leaguesApi.getPicksFeed(tokens.accessToken, leagueId, {
          cursor: mode === 'more' ? cursor ?? undefined : undefined,
          limit: 30,
        });
        setIsF1Unsupported(!!res.isF1Unsupported);
        setItems((prev) => (mode === 'more' ? [...prev, ...res.items] : res.items));
        setCursor(res.nextCursor);
      } catch (e: any) {
        setError(e?.message ?? t('common.errorLoading'));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [tokens?.accessToken, leagueId, cursor, loadingMore, t],
  );

  useEffect(() => {
    load('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  const handleToggle = useCallback(
    async (predictionId: string, emoji: PickReactionKey) => {
      if (!tokens?.accessToken) return;
      // Optimistic update
      const prevItems = items;
      setItems((current) =>
        current.map((it) => {
          if (it.predictionId !== predictionId) return it;
          const had = it.reactions.myReactions.includes(emoji);
          const newMy = had
            ? it.reactions.myReactions.filter((e) => e !== emoji)
            : [...it.reactions.myReactions, emoji];
          const newCounts = { ...it.reactions.counts };
          newCounts[emoji] = Math.max(0, (newCounts[emoji] ?? 0) + (had ? -1 : 1));
          return { ...it, reactions: { counts: newCounts, myReactions: newMy } };
        }),
      );
      try {
        const res = await reactionsApi.toggle(tokens.accessToken, predictionId, emoji);
        setItems((current) =>
          current.map((it) =>
            it.predictionId === predictionId ? { ...it, reactions: res.summary } : it,
          ),
        );
      } catch {
        // Rollback on failure
        setItems(prevItems);
      }
    },
    [items, tokens?.accessToken],
  );

  const renderItem = useCallback(
    ({ item }: { item: LeaguePickFeedItem }) => (
      <PickFeedCard
        item={item}
        onReact={(emoji) => handleToggle(item.predictionId, emoji)}
      />
    ),
    [handleToggle],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('leaguePicksFeed.title')}
          </Text>
          {leagueName && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {leagueName}
            </Text>
          )}
        </View>
      </View>

      {isF1Unsupported ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Feather name="info" size={28} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>{t('leaguePicksFeed.f1Unsupported')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.predictionId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['2xl'] }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => load('more')}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : null
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>{t('leaguePicksFeed.empty')}</Text>
              </View>
            ) : null
          }
        />
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function PickFeedCard({
  item,
  onReact,
}: {
  item: LeaguePickFeedItem;
  onReact: (emoji: PickReactionKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.avatar ? (
          <ExpoImage source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {item.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.displayName}
            {item.isSelf ? ` (${t('common.you')})` : ''}
          </Text>
          <Text style={styles.gameLine} numberOfLines={1}>
            {item.awayTeamName} @ {item.homeTeamName}
          </Text>
        </View>
        <StatusBadge status={item.status} points={item.pointsAwarded} />
      </View>

      <View style={styles.pickBody}>
        <Text style={styles.pickSummary}>{describePick(item, t)}</Text>
      </View>

      <ReactionBar summary={item.reactions} onToggle={onReact} />
    </View>
  );
}

function StatusBadge({ status, points }: { status: string; points?: number }) {
  const { t } = useTranslation();
  let label = t(`predictionStatus.${status}`, { defaultValue: status });
  let bg: string = colors.surfaceContainer;
  let fg: string = colors.onSurfaceVariant;
  if (status === 'correct' || status === 'won') {
    bg = colors.primary + '22';
    fg = colors.primary;
    if (points) label = `+${points}`;
  } else if (status === 'incorrect' || status === 'lost') {
    bg = '#EF444422';
    fg = '#EF4444';
  }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function describePick(item: LeaguePickFeedItem, t: (k: string, o?: any) => string): string {
  switch (item.predictionType) {
    case 'winner':
      return t('pickDescribe.winner', { pick: item.predictedOutcome });
    case 'exact_score':
      return t('pickDescribe.score', {
        home: item.predictedHomeScore,
        away: item.predictedAwayScore,
      });
    case 'over_under':
      return `${item.side?.toUpperCase()} ${item.threshold}`;
    case 'btts':
      return `BTTS: ${item.bttsAnswer?.toUpperCase()}`;
    case 'method_of_victory':
      return item.methodOfVictory ?? '';
    case 'goes_the_distance':
      return `Distance: ${item.distanceAnswer?.toUpperCase()}`;
    default:
      return item.predictedOutcome ?? item.predictionType;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.onSurface, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: colors.onSurfaceVariant, fontSize: 13 },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: colors.onSurface, fontWeight: '700' },
  userName: { color: colors.onSurface, fontSize: 15, fontWeight: '600' },
  gameLine: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  pickBody: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  pickSummary: { color: colors.onSurface, fontSize: 14, fontWeight: '600' },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  emptyText: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorBanner: {
    position: 'absolute',
    bottom: spacing['2xl'],
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: '#EF4444',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: { color: '#fff', fontSize: 13, textAlign: 'center' },
});
