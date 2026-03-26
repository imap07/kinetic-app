import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

const NOTIFICATIONS = [
  {
    id: '1',
    type: 'prediction' as const,
    title: 'Prediction Result',
    message: 'Your prediction on Lakers vs Celtics was correct! +150 pts',
    time: '2 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'streak' as const,
    title: 'Streak Bonus',
    message: 'You are on a 5-day prediction streak! Keep it going.',
    time: '1 hr ago',
    read: false,
  },
  {
    id: '3',
    type: 'live' as const,
    title: 'Live Match Starting',
    message: 'Arsenal vs Man City kicks off in 10 minutes. Make your pick!',
    time: '3 hrs ago',
    read: true,
  },
  {
    id: '4',
    type: 'rank' as const,
    title: 'Rank Up!',
    message: 'Congratulations! You reached Master Rank. 1,550 pts to Legend.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '5',
    type: 'reward' as const,
    title: 'Weekly Reward Unlocked',
    message: 'You finished in the Top 10% this week. Claim your bonus.',
    time: '2 days ago',
    read: true,
  },
  {
    id: '6',
    type: 'prediction' as const,
    title: 'Prediction Result',
    message: 'Your prediction on PSG vs Bayern was incorrect. -50 pts',
    time: '3 days ago',
    read: true,
  },
];

type NotifType = 'prediction' | 'streak' | 'live' | 'rank' | 'reward';

function getNotifIcon(type: NotifType, read: boolean) {
  const iconColor = read ? colors.onSurfaceDim : colors.primary;
  switch (type) {
    case 'prediction':
      return <MaterialCommunityIcons name="poll" size={20} color={iconColor} />;
    case 'streak':
      return <Ionicons name="flame" size={20} color={read ? colors.onSurfaceDim : '#FC5B00'} />;
    case 'live':
      return <Feather name="radio" size={20} color={read ? colors.onSurfaceDim : '#FF4444'} />;
    case 'rank':
      return <Ionicons name="trophy" size={20} color={read ? colors.onSurfaceDim : '#FFD700'} />;
    case 'reward':
      return <MaterialCommunityIcons name="gift" size={20} color={iconColor} />;
  }
}

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [pushEnabled, setPushEnabled] = useState(true);

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

        {/* Unread section */}
        {NOTIFICATIONS.some((n) => !n.read) && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>NEW</Text>
              <TouchableOpacity>
                <Text style={styles.markRead}>Mark all read</Text>
              </TouchableOpacity>
            </View>
            {NOTIFICATIONS.filter((n) => !n.read).map((n) => (
              <View key={n.id} style={[styles.notifCard, styles.notifCardUnread]}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(202,253,0,0.1)' }]}>
                  {getNotifIcon(n.type, false)}
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTop}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    <View style={styles.unreadDot} />
                  </View>
                  <Text style={styles.notifMessage}>{n.message}</Text>
                  <Text style={styles.notifTime}>{n.time}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Read section */}
        {NOTIFICATIONS.some((n) => n.read) && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>EARLIER</Text>
            </View>
            {NOTIFICATIONS.filter((n) => n.read).map((n) => (
              <View key={n.id} style={styles.notifCard}>
                <View style={styles.iconCircle}>
                  {getNotifIcon(n.type, true)}
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitleRead}>{n.title}</Text>
                  <Text style={styles.notifMessageRead}>{n.message}</Text>
                  <Text style={styles.notifTime}>{n.time}</Text>
                </View>
              </View>
            ))}
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
