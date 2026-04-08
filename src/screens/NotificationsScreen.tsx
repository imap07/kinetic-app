import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../api/notifications';
import type { NotificationLog } from '../api/notifications';

function getNotifIcon(type: string, read: boolean) {
  const iconColor = read ? colors.onSurfaceDim : colors.primary;
  switch (type) {
    case 'prediction_resolved':
    case 'prediction_result':
      return <MaterialCommunityIcons name="poll" size={20} color={iconColor} />;
    case 'game_start':
      return <Feather name="play-circle" size={20} color={iconColor} />;
    case 'live_score':
      return <Feather name="activity" size={20} color={iconColor} />;
    case 'game_end':
      return <Feather name="flag" size={20} color={iconColor} />;
    case 'coin_league_start':
    case 'coin_league_end':
    case 'league_update':
      return <Ionicons name="trophy" size={20} color={read ? colors.onSurfaceDim : '#FFD700'} />;
    case 'daily_reminder':
      return <Feather name="clock" size={20} color={iconColor} />;
    case 'achievement':
      return <Ionicons name="flame" size={20} color={read ? colors.onSurfaceDim : '#FC5B00'} />;
    case 'system':
    default:
      return <MaterialCommunityIcons name="gift" size={20} color={iconColor} />;
  }
}

function formatNotifTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('notifications.justNow');
  if (diffMin < 60) return t('notifications.minAgo', { count: diffMin });
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return diffHrs === 1 ? t('notifications.hrAgo', { count: diffHrs }) : t('notifications.hrsAgo', { count: diffHrs });
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return t('notifications.dayAgo');
  if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens } = useAuth();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    if (!tokens?.accessToken) return;
    try {
      const res = await notificationsApi.getHistory(tokens.accessToken, pageNum);
      const items = res?.data ?? [];
      if (append) {
        setNotifications((prev) => [...prev, ...items]);
      } else {
        setNotifications(items);
      }
      setPage(pageNum);
      setHasMore(pageNum < (res?.totalPages ?? 1));
    } catch {
      if (!append) setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetchNotifications(page + 1, true);
  }, [hasMore, loading, page, fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!tokens?.accessToken) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead(tokens.accessToken);
    } catch {
      // silent — already updated locally
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!tokens?.accessToken) return;
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );
    try {
      await notificationsApi.markRead(id, tokens.accessToken);
    } catch {
      // silent — already updated locally
    }
  };

  const unreadNotifs = (notifications ?? []).filter((n) => !n.read);
  const readNotifs = (notifications ?? []).filter((n) => n.read);

  const renderNotifCard = (n: NotificationLog, isUnread: boolean) => (
    <TouchableOpacity
      key={n._id}
      activeOpacity={0.7}
      onPress={() => {
        if (!n.read) handleMarkRead(n._id);
      }}
      style={[styles.notifCard, isUnread && styles.notifCardUnread]}
    >
      <View style={[styles.iconCircle, isUnread && { backgroundColor: 'rgba(202,253,0,0.1)' }]}>
        {getNotifIcon(n.type, !isUnread)}
      </View>
      <View style={styles.notifContent}>
        {isUnread ? (
          <View style={styles.notifTop}>
            <Text style={styles.notifTitle}>{n.title}</Text>
            <View style={styles.unreadDot} />
          </View>
        ) : (
          <Text style={styles.notifTitleRead}>{n.title}</Text>
        )}
        <Text style={isUnread ? styles.notifMessage : styles.notifMessageRead}>{n.body}</Text>
        <Text style={styles.notifTime}>{formatNotifTime(n.createdAt, t)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderListContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 32 }} />;
    }

    if (notifications.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="bell-off" size={32} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
        </View>
      );
    }

    return (
      <>
        {/* Unread section */}
        {unreadNotifs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{t('notifications.new')}</Text>
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={styles.markRead}>{t('notifications.markAllRead')}</Text>
              </TouchableOpacity>
            </View>
            {unreadNotifs.map((n) => renderNotifCard(n, true))}
          </>
        )}

        {/* Read section */}
        {readNotifs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{t('notifications.earlier')}</Text>
            </View>
            {readNotifs.map((n) => renderNotifCard(n, false))}
          </>
        )}

        {loadingMore && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('NotificationPreferences')} hitSlop={12}>
          <Feather name="settings" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[1]}
        keyExtractor={() => 'content'}
        renderItem={() => renderListContent()}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  scroll: { flex: 1 },

  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
  },
  markRead: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  notifCardUnread: {
    borderColor: 'rgba(202,253,0,0.15)',
    backgroundColor: 'rgba(202,253,0,0.03)',
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  notifContent: { flex: 1 },
  notifTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  notifTitleRead: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notifMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  notifMessageRead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceDim,
    marginTop: 4,
    lineHeight: 18,
  },
  notifTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 6,
  },
});
