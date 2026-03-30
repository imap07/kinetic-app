import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../api/notifications';
import type { NotificationLog } from '../api/notifications';

type NotifType = 'prediction_result' | 'league_update' | 'achievement' | 'system';

function getNotifIcon(type: string, read: boolean) {
  const iconColor = read ? colors.onSurfaceDim : colors.primary;
  switch (type) {
    case 'prediction_result':
      return <MaterialCommunityIcons name="poll" size={20} color={iconColor} />;
    case 'league_update':
      return <Ionicons name="trophy" size={20} color={read ? colors.onSurfaceDim : '#FFD700'} />;
    case 'achievement':
      return <Ionicons name="flame" size={20} color={read ? colors.onSurfaceDim : '#FC5B00'} />;
    case 'system':
    default:
      return <MaterialCommunityIcons name="gift" size={20} color={iconColor} />;
  }
}

function formatNotifTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await notificationsApi.getHistory(tokens.accessToken);
      setNotifications(res.notifications);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!tokens?.accessToken) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead(tokens.accessToken);
    } catch {
      // silent — already updated locally
    }
  };

  const unreadNotifs = notifications.filter((n) => !n.read);
  const readNotifs = notifications.filter((n) => n.read);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Push toggle */}
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Push Notifications</Text>
            <Text style={styles.toggleSub}>Receive alerts for live matches and results</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: colors.surfaceContainerHighest, true: 'rgba(202,253,0,0.3)' }}
            thumbColor={pushEnabled ? colors.primary : colors.onSurfaceDim}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 32 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bell-off" size={32} color={colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          <>
            {/* Unread section */}
            {unreadNotifs.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>NEW</Text>
                  <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={styles.markRead}>Mark all read</Text>
                  </TouchableOpacity>
                </View>
                {unreadNotifs.map((n) => (
                  <View key={n._id} style={[styles.notifCard, styles.notifCardUnread]}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(202,253,0,0.1)' }]}>
                      {getNotifIcon(n.type, false)}
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifTop}>
                        <Text style={styles.notifTitle}>{n.title}</Text>
                        <View style={styles.unreadDot} />
                      </View>
                      <Text style={styles.notifMessage}>{n.body}</Text>
                      <Text style={styles.notifTime}>{formatNotifTime(n.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Read section */}
            {readNotifs.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>EARLIER</Text>
                </View>
                {readNotifs.map((n) => (
                  <View key={n._id} style={styles.notifCard}>
                    <View style={styles.iconCircle}>
                      {getNotifIcon(n.type, true)}
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={styles.notifTitleRead}>{n.title}</Text>
                      <Text style={styles.notifMessageRead}>{n.body}</Text>
                      <Text style={styles.notifTime}>{formatNotifTime(n.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  toggleLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  toggleSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },

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
