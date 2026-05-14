/**
 * 1v1 Rivalries hub.
 *
 * Four buckets stacked:
 *   - Incoming  — pending challenges from someone else, with Accept/Decline.
 *   - Active    — accepted, in-window. Shows countdown + current live tally.
 *   - Outgoing  — pending challenges I sent, with Cancel.
 *   - Resolved  — past rivalries with verdict + final stats.
 *
 * The "challenge a friend" entry sits at the top with sport picker;
 * the opponent picker is delegated to a follow-up sheet that pulls
 * from the friends graph. v1 keeps the picker simple (a list).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { rivalriesApi, type Rivalry, type RivalriesResponse } from '../api/rivalries';
import { streaksApi } from '../api/streaks';
import { SPORT_TABS } from '../api/sports';

export function RivalriesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { tokens } = useAuth();

  const [data, setData] = useState<RivalriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const r = await rivalriesApi.list(tokens.accessToken);
      setData(r);
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

  const handleAccept = useCallback(
    async (r: Rivalry) => {
      if (!tokens?.accessToken) return;
      try {
        await rivalriesApi.accept(tokens.accessToken, r.id);
        await load();
      } catch (e: any) {
        Alert.alert(t('common.error'), e?.message ?? t('common.tryAgainLater'));
      }
    },
    [tokens?.accessToken, load, t],
  );

  const handleDecline = useCallback(
    async (r: Rivalry) => {
      if (!tokens?.accessToken) return;
      try {
        await rivalriesApi.decline(tokens.accessToken, r.id);
        await load();
      } catch (e: any) {
        Alert.alert(t('common.error'), e?.message ?? t('common.tryAgainLater'));
      }
    },
    [tokens?.accessToken, load, t],
  );

  const handleCancel = useCallback(
    async (r: Rivalry) => {
      if (!tokens?.accessToken) return;
      try {
        await rivalriesApi.cancel(tokens.accessToken, r.id);
        await load();
      } catch (e: any) {
        Alert.alert(t('common.error'), e?.message ?? t('common.tryAgainLater'));
      }
    },
    [tokens?.accessToken, load, t],
  );

  const sections: Array<{
    key: string;
    title: string;
    items: Rivalry[];
    actions?: 'opponent' | 'challenger' | 'none';
  }> = data
    ? [
        { key: 'incoming', title: t('rivalries.incoming', { defaultValue: 'Incoming' }), items: data.incoming, actions: 'opponent' },
        { key: 'active', title: t('rivalries.active', { defaultValue: 'Active' }), items: data.active, actions: 'none' },
        { key: 'outgoing', title: t('rivalries.outgoing', { defaultValue: 'Sent' }), items: data.outgoing, actions: 'challenger' },
        { key: 'resolved', title: t('rivalries.resolved', { defaultValue: 'Resolved' }), items: data.resolved.slice(0, 10), actions: 'none' },
      ]
    : [];

  const total = (data?.incoming.length ?? 0) + (data?.active.length ?? 0) + (data?.outgoing.length ?? 0) + (data?.resolved.length ?? 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('rivalries.title', { defaultValue: 'Rivalries' })}
        </Text>
        <TouchableOpacity onPress={() => setChallengeOpen(true)} hitSlop={12}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {total === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="flash" size={32} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>
                {t('rivalries.emptyTitle', { defaultValue: 'No rivalries yet' })}
              </Text>
              <Text style={styles.emptyBody}>
                {t('rivalries.emptyBody', {
                  defaultValue:
                    'Challenge a friend to 7 days of head-to-head picks. Higher win rate takes the bragging rights.',
                })}
              </Text>
              <TouchableOpacity style={styles.cta} onPress={() => setChallengeOpen(true)}>
                <Feather name="zap" size={14} color={colors.onPrimary} />
                <Text style={styles.ctaText}>
                  {t('rivalries.startCta', { defaultValue: 'Start a rivalry' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            sections
              .filter((s) => s.items.length > 0)
              .map((s) => (
                <View key={s.key} style={styles.section}>
                  <Text style={styles.sectionTitle}>{s.title}</Text>
                  {s.items.map((r) => (
                    <RivalryCard
                      key={r.id}
                      r={r}
                      onAccept={s.actions === 'opponent' ? () => handleAccept(r) : undefined}
                      onDecline={s.actions === 'opponent' ? () => handleDecline(r) : undefined}
                      onCancel={s.actions === 'challenger' ? () => handleCancel(r) : undefined}
                      t={t}
                    />
                  ))}
                </View>
              ))
          )}
        </ScrollView>
      )}

      <ChallengeSheet
        visible={challengeOpen}
        onClose={() => setChallengeOpen(false)}
        onSubmitted={async () => {
          setChallengeOpen(false);
          await load();
        }}
      />
    </View>
  );
}

function RivalryCard({
  r,
  onAccept,
  onDecline,
  onCancel,
  t,
}: {
  r: Rivalry;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  t: any;
}) {
  const sport = SPORT_TABS.find((s) => s.key === r.sport)?.name ?? r.sport;
  const opponentName = r.iAmChallenger ? r.opponentName : r.challengerName;

  const verdict = (() => {
    if (r.status !== 'resolved') return null;
    if (!r.winnerId) {
      return r.resolvedStats?.voidReason === 'tied'
        ? t('rivalries.tied', { defaultValue: 'Tied — bragging rights split.' })
        : t('rivalries.voidedFew', {
            defaultValue: 'Voided — not enough picks to call it.',
          });
    }
    const meWon =
      (r.iAmChallenger && r.winnerId === r.challengerId) ||
      (!r.iAmChallenger && r.winnerId === r.opponentId);
    return meWon
      ? t('rivalries.youWon', { defaultValue: 'You won 🏆' })
      : t('rivalries.youLost', { defaultValue: `${opponentName} won` });
  })();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.opponent} numberOfLines={1}>
          vs {opponentName}
        </Text>
        <Text style={styles.sport}>{sport.toUpperCase()}</Text>
      </View>
      {r.status === 'active' && r.endAt && (
        <Text style={styles.meta}>
          {t('rivalries.endsOn', {
            defaultValue: 'Ends {{date}}',
            date: new Date(r.endAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
          })}
        </Text>
      )}
      {r.status === 'pending' && (
        <Text style={styles.meta}>
          {r.iAmChallenger
            ? t('rivalries.waitingThem', { defaultValue: 'Waiting for them to accept' })
            : t('rivalries.theyChallenged', { defaultValue: 'They challenged you to 7 days' })}
        </Text>
      )}
      {r.status === 'resolved' && (
        <>
          <Text style={[styles.meta, styles.verdict]}>{verdict}</Text>
          {r.resolvedStats && r.resolvedStats.voidReason !== 'insufficient_picks' && (
            <Text style={styles.metaSmall}>
              {r.iAmChallenger
                ? `${r.resolvedStats.challengerWins}/${r.resolvedStats.challengerPicks} vs ${r.resolvedStats.opponentWins}/${r.resolvedStats.opponentPicks}`
                : `${r.resolvedStats.opponentWins}/${r.resolvedStats.opponentPicks} vs ${r.resolvedStats.challengerWins}/${r.resolvedStats.challengerPicks}`}
            </Text>
          )}
        </>
      )}
      {(onAccept || onDecline || onCancel) && (
        <View style={styles.actions}>
          {onAccept && (
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
              <Text style={styles.acceptBtnText}>
                {t('rivalries.accept', { defaultValue: 'Accept' })}
              </Text>
            </TouchableOpacity>
          )}
          {onDecline && (
            <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
              <Text style={styles.declineBtnText}>
                {t('rivalries.decline', { defaultValue: 'Decline' })}
              </Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity style={styles.declineBtn} onPress={onCancel}>
              <Text style={styles.declineBtnText}>
                {t('rivalries.cancel', { defaultValue: 'Cancel' })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function ChallengeSheet({
  visible,
  onClose,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tokens } = useAuth();
  const [friends, setFriends] = useState<Array<{ userId: string; displayName: string }>>([]);
  const [sport, setSport] = useState<string>('football');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !tokens?.accessToken) return;
    let cancelled = false;
    streaksApi.getFriendsLeaderboard(tokens.accessToken).then((rows) => {
      if (cancelled) return;
      setFriends(rows.filter((r) => !r.isMe).map((r) => ({ userId: r.userId, displayName: r.displayName })));
    });
    return () => {
      cancelled = true;
    };
  }, [visible, tokens?.accessToken]);

  const submit = async (opponentId: string) => {
    if (!tokens?.accessToken) return;
    setSubmitting(opponentId);
    try {
      await rivalriesApi.challenge(tokens.accessToken, opponentId, sport);
      await onSubmitted();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.tryAgainLater'));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>
            {t('rivalries.challengeTitle', { defaultValue: 'Challenge a friend' })}
          </Text>
          <Text style={styles.sheetSubtitle}>
            {t('rivalries.challengeSubtitle', {
              defaultValue: '7 days. Higher win rate in the chosen sport wins.',
            })}
          </Text>

          {/* Sport row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 6 }}>
            {SPORT_TABS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sportPill, sport === s.key && styles.sportPillActive]}
                onPress={() => setSport(s.key)}
              >
                <Text style={[styles.sportPillText, sport === s.key && styles.sportPillTextActive]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Friends list */}
          {friends.length === 0 ? (
            <Text style={styles.noFriends}>
              {t('rivalries.noFriends', {
                defaultValue: 'No friends yet — invite one from the Referrals screen.',
              })}
            </Text>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(f) => f.userId}
              style={{ marginTop: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.friendRow}
                  onPress={() => submit(item.userId)}
                  disabled={submitting !== null}
                >
                  <Text style={styles.friendName}>{item.displayName}</Text>
                  {submitting === item.userId ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather name="zap" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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

  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  emptyBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.onPrimary,
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },

  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  opponent: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
  },
  sport: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: colors.primary,
  },
  meta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  metaSmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
  },
  verdict: {
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    color: colors.onPrimary,
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(244,67,54,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,67,54,0.30)',
  },
  declineBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    color: colors.error,
  },

  // ── Challenge sheet ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '80%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  sheetSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 14,
  },
  sportPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
  },
  sportPillActive: { backgroundColor: colors.primary },
  sportPillText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    color: colors.onSurface,
  },
  sportPillTextActive: { color: colors.onPrimary },
  noFriends: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  friendName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
});
