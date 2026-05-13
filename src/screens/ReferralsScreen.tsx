import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../theme';
import { track } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import {
  referralsApi,
  buildReferralUrl,
  type ReferralStatus,
  type InvitedFriend,
} from '../api/referrals';

export function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens } = useAuth();
  const { t } = useTranslation();

  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [friends, setFriends] = useState<InvitedFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!tokens?.accessToken) return;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        // Fetched in parallel — neither call gates the other and the
        // friends list is the most expensive piece to wait for.
        const [s, fs] = await Promise.all([
          referralsApi.getStatus(tokens.accessToken),
          referralsApi.getFriends(tokens.accessToken).catch(() => [] as InvitedFriend[]),
        ]);
        setStatus(s);
        setFriends(fs);
      } catch (e: any) {
        Alert.alert(t('common.error'), e?.message ?? t('common.somethingWrong'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tokens?.accessToken, t],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const handleCopy = useCallback(async () => {
    if (!status?.code) return;
    await Clipboard.setStringAsync(status.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [status?.code]);

  const handleShare = useCallback(async () => {
    if (!status?.code) return;
    const url = buildReferralUrl(status.code);
    const message = t('referrals.shareMessage', {
      url,
      coins: status.rewardCoins,
      code: status.code,
    });
    try {
      const res = await Share.share({ message });
      if (res.action === Share.sharedAction) {
        track({ event: 'referral_invited', channel: 'native_share' });
      }
    } catch {
      /* user cancelled */
    }
  }, [status, t]);

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
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('referrals.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing['2xl'],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <MaterialCommunityIcons
            name="gift-outline"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.heroTitle}>
            {t('referrals.heroTitle', { coins: status?.rewardCoins ?? 50 })}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t('referrals.heroSubtitle', {
              picks: status?.qualifyPicks ?? 3,
            })}
          </Text>
        </View>

        {/* Code card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('referrals.yourCode')}</Text>
          <Text style={styles.codeValue}>{status?.code}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGhost]}
              onPress={handleCopy}
              activeOpacity={0.7}
            >
              <Feather name={copied ? 'check' : 'copy'} size={16} color={colors.onSurface} />
              <Text style={styles.actionBtnText}>
                {copied ? t('referrals.copied') : t('referrals.copy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Feather name="share-2" size={16} color={colors.surface} />
              <Text style={[styles.actionBtnText, { color: colors.surface }]}>
                {t('referrals.share')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCell
            label={t('referrals.statPending')}
            value={status?.pending ?? 0}
          />
          <StatCell
            label={t('referrals.statQualified')}
            value={(status?.qualified ?? 0) + (status?.rewarded ?? 0)}
          />
          <StatCell
            label={t('referrals.statCoinsEarned')}
            value={status?.coinsEarned ?? 0}
            highlight
          />
        </View>

        {/* Invited friends — per-referee progress. Surfaces the
            "Carlos: 1/3 picks resolved" information that the
            aggregate stat cells above hide, so the user knows
            which specific friend to nudge. Hidden when nobody's
            been invited yet; the How-it-works block below
            covers the empty case. */}
        {friends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('referrals.invitedFriendsTitle', { defaultValue: 'Invited friends' })}
            </Text>
            {friends.map((f) => (
              <FriendRow key={f.referralId} friend={f} t={t} />
            ))}
          </View>
        )}

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('referrals.howTitle')}</Text>
          <Step n={1} text={t('referrals.howStep1')} />
          <Step n={2} text={t('referrals.howStep2', { picks: status?.qualifyPicks ?? 3 })} />
          <Step n={3} text={t('referrals.howStep3', { coins: status?.rewardCoins ?? 50 })} />
        </View>

        {/* Fine print */}
        <Text style={styles.finePrint}>{t('referrals.finePrint')}</Text>
      </ScrollView>
    </View>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, highlight && { color: colors.primary }]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function FriendRow({
  friend,
  t,
}: {
  friend: InvitedFriend;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const done = friend.status === 'qualified' || friend.status === 'rewarded';
  const blocked = friend.status === 'blocked';
  const progress = Math.min(friend.picksResolved / friend.picksNeeded, 1);

  const statusLabel = blocked
    ? t('referrals.friendBlocked', { defaultValue: 'Blocked' })
    : friend.status === 'rewarded'
      ? t('referrals.friendRewarded', { defaultValue: 'Rewarded ✓' })
      : friend.status === 'qualified'
        ? t('referrals.friendQualified', { defaultValue: 'Qualified — paying out' })
        : t('referrals.friendProgress', {
            defaultValue: '{{r}}/{{n}} picks resolved',
            r: friend.picksResolved,
            n: friend.picksNeeded,
          });

  return (
    <View style={styles.friendRow}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>
          {(friend.refereeDisplayName || '?').slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendBody}>
        <Text style={styles.friendName} numberOfLines={1}>
          {friend.refereeDisplayName}
        </Text>
        <Text
          style={[
            styles.friendStatus,
            done && styles.friendStatusDone,
            blocked && styles.friendStatusBlocked,
          ]}
        >
          {statusLabel}
        </Text>
        {/* Progress bar hidden for terminal states (done / blocked).
            Keeps the row visually quiet once nothing else can change. */}
        {!done && !blocked && (
          <View style={styles.friendProgressBar}>
            <View
              style={[
                styles.friendProgressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: '700',
  },
  hero: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  heroSubtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '33',
    gap: spacing.md,
  },
  codeLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  codeValue: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionBtnGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
  },
  finePrint: {
    marginTop: spacing.xl,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(202,253,0,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  friendBody: {
    flex: 1,
    gap: 4,
  },
  friendName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  friendStatus: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  friendStatusDone: {
    color: colors.primary,
  },
  friendStatusBlocked: {
    color: colors.error,
  },
  friendProgressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  friendProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
