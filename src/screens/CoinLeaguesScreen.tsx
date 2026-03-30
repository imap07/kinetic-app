/**
 * CoinLeagues (Prediction Leagues)
 *
 * Mechanics:
 * - Users create or join prediction leagues by paying a coin entry fee.
 * - Coins are in-app currency purchased via RevenueCat IAP (not real money).
 * - Entry fees are locked from the user's coin wallet upon joining.
 * - When a league resolves, the winner receives the prize pool minus a 10% Kinetic fee.
 * - If a league is cancelled, locked coins are refunded to all participants.
 * - Minimum 2 participants required for league resolution.
 * - Leagues have statuses: open -> active -> completed | cancelled.
 *
 * Revenue model:
 * - 10% platform fee on resolved league prize pools.
 * - Drives coin purchases (RevenueCat IAP) as users need coins to participate.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useCoins } from '../contexts/CoinContext';
import { useAuth } from '../contexts/AuthContext';
import { leaguesApi } from '../api/leagues';
import type { CoinLeague, CreateLeagueDto } from '../api/leagues';
import { SPORT_TABS } from '../api/sports';

type TabFilter = 'open' | 'my' | 'rankings';

export function CoinLeaguesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens, user } = useAuth();
  const { balance, available, refreshBalance } = useCoins();

  const [tab, setTab] = useState<TabFilter>('open');
  const [leagues, setLeagues] = useState<CoinLeague[]>([]);
  const [myLeagues, setMyLeagues] = useState<CoinLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchLeagues = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const [openRes, myRes] = await Promise.all([
        leaguesApi.getAll(tokens.accessToken, { status: 'open' }),
        leaguesApi.getMyLeagues(tokens.accessToken),
      ]);
      setLeagues(openRes.leagues);
      setMyLeagues(myRes);
    } catch {
      // Fetch failed silently
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    setLoading(true);
    fetchLeagues().finally(() => setLoading(false));
  }, [fetchLeagues]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchLeagues(), refreshBalance()]);
    setRefreshing(false);
  }, [fetchLeagues, refreshBalance]);

  const handleJoin = async (league: CoinLeague) => {
    if (available < league.entryFee) {
      Alert.alert('Insufficient Coins', `You need ${league.entryFee} coins to join. Current available: ${available}.`);
      return;
    }
    Alert.alert(
      'Join League',
      `Entry fee: ${league.entryFee} coins. This will be locked from your balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            setActionLoading(league._id);
            try {
              await leaguesApi.join(tokens!.accessToken, league._id);
              await Promise.all([fetchLeagues(), refreshBalance()]);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not join league.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleLeave = async (league: CoinLeague) => {
    Alert.alert(
      'Leave League',
      'Your locked coins will be returned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(league._id);
            try {
              await leaguesApi.leave(tokens!.accessToken, league._id);
              await Promise.all([fetchLeagues(), refreshBalance()]);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not leave league.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleCreate = async (dto: CreateLeagueDto) => {
    if (available < dto.entryFee) {
      Alert.alert('Insufficient Coins', `You need ${dto.entryFee} coins to create and join this league.`);
      return;
    }
    setActionLoading('create');
    try {
      await leaguesApi.create(tokens!.accessToken, dto);
      setShowCreate(false);
      await Promise.all([fetchLeagues(), refreshBalance()]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create league.');
    } finally {
      setActionLoading(null);
    }
  };

  const isParticipant = (league: CoinLeague) =>
    league.participants.some((p) => p.userId === user?.id);

  const displayLeagues = tab === 'open' ? leagues : myLeagues;

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.primary;
      case 'active': return colors.info;
      case 'completed': return colors.secondary;
      case 'cancelled': return colors.error;
      default: return colors.onSurfaceDim;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>LEAGUES</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} hitSlop={12}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.balancePill}>
        <MaterialCommunityIcons name="circle-multiple" size={16} color={colors.primary} />
        <Text style={styles.balancePillText}>{available.toLocaleString()} coins</Text>
      </View>

      <View style={styles.tabs}>
        {(['open', 'my', 'rankings'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => {
              if (t === 'rankings') {
                (navigation as any).navigate('Leaderboard');
                return;
              }
              setTab(t);
            }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'open' ? 'Open' : t === 'my' ? 'My Leagues' : 'Rankings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['4xl'] }} />
        ) : displayLeagues.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trophy-outline" size={40} color={colors.onSurfaceDim} />
            <Text style={styles.emptyText}>
              {tab === 'open'
                ? 'No open leagues available right now.'
                : 'You haven\'t joined any leagues yet.'}
            </Text>
            {tab === 'open' && (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setShowCreate(true)}
              >
                <Feather name="plus" size={16} color={colors.onPrimary} />
                <Text style={styles.createBtnText}>Create League</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayLeagues.map((league) => {
            const isMember = isParticipant(league);
            const isActionLoading = actionLoading === league._id;
            const sportMeta = SPORT_TABS.find((s) => s.key === league.sport);
            return (
              <View key={league._id} style={styles.leagueCard}>
                <View style={styles.leagueHeader}>
                  <View style={styles.leagueNameRow}>
                    <Text style={styles.leagueName} numberOfLines={1}>{league.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor(league.status)}20` }]}>
                      <Text style={[styles.statusText, { color: statusColor(league.status) }]}>
                        {league.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {sportMeta && (
                    <Text style={styles.leagueSport}>{sportMeta.name}</Text>
                  )}
                </View>

                <View style={styles.leagueStats}>
                  <View style={styles.leagueStat}>
                    <Text style={styles.leagueStatLabel}>Entry</Text>
                    <Text style={styles.leagueStatValue}>{league.entryFee}</Text>
                    <MaterialCommunityIcons name="circle-multiple" size={10} color={colors.primary} />
                  </View>
                  <View style={styles.leagueStat}>
                    <Text style={styles.leagueStatLabel}>Players</Text>
                    <Text style={styles.leagueStatValue}>
                      {league.participants.length}/{league.maxParticipants}
                    </Text>
                  </View>
                  <View style={styles.leagueStat}>
                    <Text style={styles.leagueStatLabel}>Prize Pool</Text>
                    <Text style={styles.leagueStatValue}>{league.prizePool}</Text>
                    <MaterialCommunityIcons name="circle-multiple" size={10} color={colors.primary} />
                  </View>
                  <View style={styles.leagueStat}>
                    <Text style={styles.leagueStatLabel}>Ends</Text>
                    <Text style={styles.leagueStatValue}>
                      {new Date(league.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>

                {league.status === 'open' && (
                  <View style={styles.leagueActions}>
                    {isMember ? (
                      <TouchableOpacity
                        style={styles.leaveBtn}
                        onPress={() => handleLeave(league)}
                        disabled={!!actionLoading}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <Text style={styles.leaveBtnText}>Leave</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.joinBtn}
                        onPress={() => handleJoin(league)}
                        disabled={!!actionLoading}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                          <Text style={styles.joinBtnText}>Join League</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {league.status === 'completed' && league.winnerId && (
                  <View style={styles.winnerRow}>
                    <Ionicons name="trophy" size={14} color="#FFD700" />
                    <Text style={styles.winnerText}>
                      {league.winnerId === user?.id ? 'You won!' : 'Winner declared'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <CreateLeagueModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        isLoading={actionLoading === 'create'}
      />
    </View>
  );
}

function CreateLeagueModal({
  visible,
  onClose,
  onCreate,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (dto: CreateLeagueDto) => void;
  isLoading: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [sport, setSport] = useState(SPORT_TABS[0].key);
  const [entryFee, setEntryFee] = useState('10');
  const [maxParticipants, setMaxParticipants] = useState('10');

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'League name is required.');
      return;
    }
    const fee = parseInt(entryFee, 10);
    if (isNaN(fee) || fee < 1) {
      Alert.alert('Error', 'Entry fee must be at least 1 coin.');
      return;
    }
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    onCreate({
      name: name.trim(),
      sport,
      entryFee: fee,
      maxParticipants: parseInt(maxParticipants, 10) || 10,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Create League</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <Text style={modalStyles.label}>League Name</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Weekend Warriors"
            placeholderTextColor={colors.onSurfaceDim}
            maxLength={40}
          />

          <Text style={modalStyles.label}>Sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.sportRow}>
            {SPORT_TABS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[modalStyles.sportChip, sport === s.key && modalStyles.sportChipActive]}
                onPress={() => setSport(s.key)}
              >
                <Text
                  style={[modalStyles.sportChipText, sport === s.key && modalStyles.sportChipTextActive]}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={modalStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>Entry Fee (coins)</Text>
              <TextInput
                style={modalStyles.input}
                value={entryFee}
                onChangeText={setEntryFee}
                keyboardType="number-pad"
                placeholderTextColor={colors.onSurfaceDim}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>Max Players</Text>
              <TextInput
                style={modalStyles.input}
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                keyboardType="number-pad"
                placeholderTextColor={colors.onSurfaceDim}
              />
            </View>
          </View>

          <Text style={modalStyles.hint}>
            League starts in 24h and runs for 7 days. 10% platform fee applies.
          </Text>

          <TouchableOpacity
            style={modalStyles.submitBtn}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={modalStyles.submitBtnText}>Create & Join</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outline,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2xl'],
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.onSurface,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurface,
  },
  sportRow: {
    marginBottom: spacing.sm,
  },
  sportChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  sportChipActive: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderColor: colors.primary,
  },
  sportChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  sportChipTextActive: {
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  submitBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: colors.primary,
    letterSpacing: -0.5,
  },

  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(202,253,0,0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  balancePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.sm,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  tabActive: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceDim,
  },
  tabTextActive: {
    color: colors.onSurface,
  },

  scroll: { flex: 1 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  createBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onPrimary,
  },

  leagueCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
  },
  leagueHeader: { marginBottom: spacing.md },
  leagueNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  leagueName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  leagueSport: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },

  leagueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  leagueStat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  leagueStatLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceDim,
    letterSpacing: 0.5,
    marginRight: 4,
  },
  leagueStatValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.onSurface,
  },

  leagueActions: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.md,
  },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  joinBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onPrimary,
  },
  leaveBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  leaveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.error,
  },

  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  winnerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFD700',
  },
});
