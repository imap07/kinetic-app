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
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../theme';
import { ModalCloseButton } from '../components';
import { useCoins } from '../contexts/CoinContext';
import { useAuth } from '../contexts/AuthContext';
import { leaguesApi } from '../api/leagues';
import type { CoinLeague, CreateLeagueDto } from '../api/leagues';
import { SPORT_TABS } from '../api/sports';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdBanner } from '../components/AdBanner';
import { RewardedAdButton } from '../components/RewardedAdButton';

type TabFilter = 'open' | 'my' | 'rankings';

export function CoinLeaguesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens, user } = useAuth();
  const { balance, available, refreshBalance } = useCoins();
  const { t } = useTranslation();

  const [tab, setTab] = useState<TabFilter>('open');
  const [activeSport, setActiveSport] = useState<string>('all');
  const [leagues, setLeagues] = useState<CoinLeague[]>([]);
  const [myLeagues, setMyLeagues] = useState<CoinLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Sports the user follows (for filter chips)
  const sportFilters = useMemo(() => {
    const userSports = user?.favoriteSports?.length
      ? SPORT_TABS.filter((s) => user.favoriteSports!.includes(s.key))
      : SPORT_TABS;
    return [{ key: 'all', name: t('leagues.allSports') }, ...userSports];
  }, [user?.favoriteSports, t]);

  const fetchLeagues = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const sportFilter = activeSport !== 'all' ? activeSport : undefined;
      const [openRes, myRes] = await Promise.all([
        leaguesApi.getAll(tokens.accessToken, { status: 'open', sport: sportFilter }),
        leaguesApi.getMyLeagues(tokens.accessToken),
      ]);
      setLeagues(openRes.leagues);
      setMyLeagues(myRes);
    } catch {
      // Fetch failed silently
    }
  }, [tokens?.accessToken, activeSport]);

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
      Alert.alert(t('leagues.insufficientCoins'), t('leagues.insufficientCoinsDesc', { fee: league.entryFee, available }));
      return;
    }
    Alert.alert(
      t('leagues.joinLeague'),
      league.entryFee > 0
        ? t('leagues.joinLeagueDesc', { fee: league.entryFee })
        : t('leagues.joinFreeLeagueDesc'),
      [
        { text: t('leagues.cancel'), style: 'cancel' },
        {
          text: t('leagues.join'),
          onPress: async () => {
            setActionLoading(league._id);
            try {
              await leaguesApi.join(tokens!.accessToken, league._id);
              await Promise.all([fetchLeagues(), refreshBalance()]);
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message || t('leagues.couldNotJoin'));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleLeave = async (league: CoinLeague) => {
    const isCreator = String(league.creatorId) === user?.id && !league.isSystemLeague;
    Alert.alert(
      isCreator ? t('leagues.deleteLeague') : t('leagues.leaveLeague'),
      isCreator ? t('leagues.deleteLeagueDesc') : t('leagues.leaveLeagueDesc'),
      [
        { text: t('leagues.cancel'), style: 'cancel' },
        {
          text: isCreator ? t('leagues.delete') : t('leagues.leave'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(league._id);
            try {
              await leaguesApi.leave(tokens!.accessToken, league._id);
              await Promise.all([fetchLeagues(), refreshBalance()]);
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message || t('leagues.couldNotLeave'));
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
      Alert.alert(t('leagues.insufficientCoins'), t('leagues.insufficientCoinsDesc', { fee: dto.entryFee, available }));
      return;
    }
    setActionLoading('create');
    try {
      await leaguesApi.create(tokens!.accessToken, dto);
      setShowCreate(false);
      await Promise.all([fetchLeagues(), refreshBalance()]);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('leagues.couldNotCreate'));
    } finally {
      setActionLoading(null);
    }
  };

  const isParticipant = (league: CoinLeague) =>
    String(league.creatorId) === user?.id ||
    league.participants.some((p) => String(p.userId) === user?.id);

  const filteredMyLeagues = useMemo(() => {
    if (activeSport === 'all') return myLeagues;
    return myLeagues.filter((l) => l.sport === activeSport);
  }, [myLeagues, activeSport]);

  const displayLeagues = tab === 'open' ? leagues : filteredMyLeagues;

  const handleShare = async (league: CoinLeague) => {
    const code = league.inviteCode;
    if (!code) return;
    try {
      await Share.share({
        message: t('leagues.shareMessage', { name: league.name, code, url: `https://kineticapp.ca/join/${code}` }),
      });
    } catch {}
  };

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
        <Text style={styles.headerTitle}>{t('leagues.title')}</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} hitSlop={12}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.pillRow}>
        <View style={styles.balancePill}>
          <MaterialCommunityIcons name="circle-multiple" size={16} color={colors.primary} />
          <Text style={styles.balancePillText}>{t('leagues.coins', { count: available.toLocaleString() })}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['open', 'my', 'rankings'] as const).map((tabKey) => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tab, tab === tabKey && styles.tabActive]}
            onPress={() => {
              if (tabKey === 'rankings') {
                (navigation as any).navigate('Leaderboard');
                return;
              }
              setTab(tabKey);
            }}
          >
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'open' ? t('leagues.open') : tabKey === 'my' ? t('leagues.myLeagues') : t('leagues.rankings')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sport Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sportFilterRow}
        contentContainerStyle={styles.sportFilterContent}
      >
        {sportFilters.map((s) => {
          const isActive = activeSport === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.sportFilterChip, isActive && styles.sportFilterChipActive]}
              onPress={() => setActiveSport(s.key)}
            >
              <Text style={[styles.sportFilterText, isActive && styles.sportFilterTextActive]}>
                {s.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Ad Banner */}
      <AdBanner placement="leagues" />
      <RewardedAdButton />

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
                ? t('leagues.noOpenLeagues')
                : t('leagues.noJoinedLeagues')}
            </Text>
            {tab === 'open' && (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setShowCreate(true)}
              >
                <Feather name="plus" size={16} color={colors.onPrimary} />
                <Text style={styles.createBtnText}>{t('leagues.createLeague')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayLeagues.map((league) => {
            const isMember = isParticipant(league);
            const isActionLoading = actionLoading === league._id;
            const sportMeta = SPORT_TABS.find((s) => s.key === league.sport);
            return (
              <TouchableOpacity
                key={league._id}
                style={styles.leagueCard}
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('CoinLeagueDetail', { leagueId: league._id })}
              >
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
                    <Text style={styles.leagueStatLabel}>{t('leagues.entry')}</Text>
                    <Text style={styles.leagueStatValue}>{league.entryFee}</Text>
                    <MaterialCommunityIcons name="circle-multiple" size={10} color={colors.primary} />
                  </View>
                  <View style={styles.leagueStat}>
                    <Text style={styles.leagueStatLabel}>{t('leagues.players')}</Text>
                    <Text style={styles.leagueStatValue}>
                      {league.participants.length}/{league.maxParticipants}
                    </Text>
                  </View>
                  <View style={styles.leagueStat}>
                    <Text style={styles.leagueStatLabel}>{t('leagues.prizePool')}</Text>
                    <Text style={styles.leagueStatValue}>{league.prizePool}</Text>
                    <MaterialCommunityIcons name="circle-multiple" size={10} color={colors.primary} />
                  </View>
                  <View style={styles.leagueStat}>
                    <Text style={styles.leagueStatLabel}>{t('leagues.ends')}</Text>
                    <Text style={styles.leagueStatValue}>
                      {new Date(league.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>

                {league.status === 'open' && (
                  <View style={styles.leagueActions}>
                    <View style={styles.leagueActionsRow}>
                      {isMember ? (
                        <TouchableOpacity
                          style={[styles.leaveBtn, { flex: 1 }]}
                          onPress={() => handleLeave(league)}
                          disabled={!!actionLoading}
                        >
                          {isActionLoading ? (
                            <ActivityIndicator size="small" color={colors.error} />
                          ) : (
                            <Text style={styles.leaveBtnText}>
                              {String(league.creatorId) === user?.id && !league.isSystemLeague
                                ? t('leagues.delete')
                                : t('leagues.leave')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.joinBtn, { flex: 1 }]}
                          onPress={() => handleJoin(league)}
                          disabled={!!actionLoading}
                        >
                          {isActionLoading ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                          ) : (
                            <Text style={styles.joinBtnText}>
                              {league.entryFee === 0 ? t('leagues.join') : t('leagues.joinLeague')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      {league.inviteCode && (
                        <TouchableOpacity
                          style={styles.shareBtn}
                          onPress={() => handleShare(league)}
                          hitSlop={8}
                        >
                          <Ionicons name="share-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {league.status === 'completed' && league.winners?.length > 0 && (
                  <View style={styles.winnerRow}>
                    <Ionicons name="trophy" size={14} color="#FFD700" />
                    <Text style={styles.winnerText}>
                      {league.winners.find((w) => String(w.userId) === user?.id)
                        ? t('leagues.youPlaced', { position: league.winners.find((w) => String(w.userId) === user?.id)?.position, coins: league.winners.find((w) => String(w.userId) === user?.id)?.coinsWon })
                        : t('leagues.winnersCount', { count: league.winners.length })}
                    </Text>
                  </View>
                )}
                {league.status === 'completed' && (!league.winners || league.winners.length === 0) && league.winnerId && (
                  <View style={styles.winnerRow}>
                    <Ionicons name="trophy" size={14} color="#FFD700" />
                    <Text style={styles.winnerText}>
                      {String(league.winnerId) === user?.id ? t('leagues.youWon') : t('leagues.winnerDeclared')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <CreateLeagueModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        isLoading={actionLoading === 'create'}
        favoriteSports={user?.favoriteSports}
      />
    </View>
  );
}

function CreateLeagueModal({
  visible,
  onClose,
  onCreate,
  isLoading,
  favoriteSports,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (dto: CreateLeagueDto) => void;
  isLoading: boolean;
  favoriteSports?: string[];
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Show only the user's favorite sports; fall back to all if none set
  const availableSports = favoriteSports?.length
    ? SPORT_TABS.filter((s) => favoriteSports.includes(s.key))
    : SPORT_TABS;

  const [name, setName] = useState('');
  const [sport, setSport] = useState(availableSports[0]?.key ?? SPORT_TABS[0].key);
  const [entryFee, setEntryFee] = useState(0);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName('');
      setSport(availableSports[0]?.key ?? SPORT_TABS[0].key);
      setEntryFee(0);
    }
  }, [visible]);

  const TIERS = [
    { fee: 0, label: t('leagues.tierFree'), desc: t('leagues.tierRankingOnly') },
    { fee: 5, label: '5', desc: t('leagues.tierCasual') },
    { fee: 15, label: '15', desc: t('leagues.tierCompetitive') },
    { fee: 50, label: '50', desc: t('leagues.tierHighStakes') },
    { fee: 100, label: '100', desc: t('leagues.tierElite') },
  ];

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('leagues.leagueNameRequired'));
      return;
    }
    const now = new Date();
    const isF1 = sport === 'formula-1';
    const startDate = new Date(now.getTime() + (isF1 ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000));
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    onCreate({
      name: name.trim(),
      sport,
      entryFee,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      leagueType: isF1 ? 'race_weekend' : 'weekly',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{t('leagues.createLeague')}</Text>
            <ModalCloseButton onClose={onClose} variant="sheet" />
          </View>

          <Text style={modalStyles.label}>{t('leagues.leagueName')}</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('leagues.leagueNamePlaceholder')}
            placeholderTextColor={colors.onSurfaceDim}
            maxLength={40}
          />

          <Text style={modalStyles.label}>{t('leagues.sport')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.sportRow}>
            {availableSports.map((s) => (
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

          <Text style={modalStyles.label}>{t('leagues.entryFeeLabel')}</Text>
          <View style={modalStyles.tierRow}>
            {TIERS.map((t) => (
              <TouchableOpacity
                key={t.fee}
                style={[modalStyles.tierChip, entryFee === t.fee && modalStyles.tierChipActive]}
                onPress={() => setEntryFee(t.fee)}
              >
                <Text style={[modalStyles.tierChipText, entryFee === t.fee && modalStyles.tierChipTextActive]}>
                  {t.fee === 0 ? 'FREE' : `${t.fee}`}
                </Text>
                <Text style={[modalStyles.tierChipDesc, entryFee === t.fee && modalStyles.tierChipDescActive]}>
                  {t.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modalStyles.hint}>
            {entryFee === 0
              ? t('leagues.freeLeagueHint')
              : t('leagues.paidLeagueHint')}
          </Text>

          <TouchableOpacity
            style={modalStyles.submitBtn}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={modalStyles.submitBtnText}>{t('leagues.create')}</Text>
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
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tierChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    minWidth: 58,
  },
  tierChipActive: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderColor: colors.primary,
  },
  tierChipText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  tierChipTextActive: {
    color: colors.primary,
  },
  tierChipDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: colors.onSurfaceDim,
    marginTop: 1,
  },
  tierChipDescActive: {
    color: colors.primary,
    opacity: 0.8,
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

  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(202,253,0,0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  limitPill: {
    backgroundColor: 'rgba(202,253,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.12)',
  },
  balancePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  upgradeBtn: {
    backgroundColor: '#6C3AED',
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

  sportFilterRow: { maxHeight: 44, marginBottom: 4 },
  sportFilterContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' as const },
  sportFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
  },
  sportFilterChipActive: { backgroundColor: colors.primary },
  sportFilterText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  sportFilterTextActive: { color: '#4A5E00' },

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
  leagueActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(202,253,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
