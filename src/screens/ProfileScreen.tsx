import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { AppHeader } from '../components/AppHeader';
import { ProfileStackParamList, RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchasesContext';
import { predictionsApi } from '../api/predictions';
import type { PredictionData } from '../api/predictions';
import { achievementsApi } from '../api/achievements';
import type { Achievement } from '../api/achievements';

const TIER_CONFIG: Record<string, { label: string; next: string; max: number }> = {
  rookie: { label: 'Rookie', next: 'Bronze', max: 1000 },
  bronze: { label: 'Bronze', next: 'Silver', max: 5000 },
  silver: { label: 'Silver', next: 'Gold', max: 10000 },
  gold: { label: 'Gold', next: 'Diamond', max: 25000 },
  diamond: { label: 'Diamond', next: 'Legend', max: 50000 },
  legend: { label: 'Legend', next: '', max: 100000 },
};

// Icon mapping for achievement keys from backend
const ACHIEVEMENT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  star: 'star',
  flame: 'flame',
  football: 'football',
  'checkmark-done': 'checkmark-done',
  trophy: 'trophy',
  medal: 'medal',
};

function formatOutcome(p: PredictionData, tFn: (key: string) => string): string {
  if (p.predictionType === 'exact_score' && p.predictedHomeScore != null && p.predictedAwayScore != null) {
    return `${p.predictedHomeScore}-${p.predictedAwayScore}`;
  }
  if (p.predictedOutcome === 'home') return p.homeTeamName;
  if (p.predictedOutcome === 'away') return p.awayTeamName;
  return tFn('profile.draw');
}

function formatPickDate(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return t('profile.justNow');
  if (diffHrs < 24) return t('profile.hoursAgo', { count: diffHrs });
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return t('profile.yesterday');
  if (diffDays < 7) return t('profile.daysAgo', { count: diffDays });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
}

// ── Achievement Icon ──

function AchievementIcon({ item }: { item: Achievement }) {
  const iconName = ACHIEVEMENT_ICON_MAP[item.icon] ?? 'ribbon';
  const iconSize = 22;

  if (item.unlocked) {
    return (
      <LinearGradient
        colors={['#F3FFCA', '#CAFD00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.achieveIconWrap}
      >
        <Ionicons name={iconName} size={iconSize} color="#4A5E00" />
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.achieveIconWrap,
        {
          backgroundColor: 'rgba(69,72,76,0.15)',
          borderWidth: 1,
          borderColor: 'rgba(69,72,76,0.2)',
        },
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color="rgba(255,255,255,0.25)" />
    </View>
  );
}

// ── Main Screen ──

export function ProfileScreen() {
  const { t } = useTranslation();
  const profileNav = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout, user, tokens } = useAuth();
  const { isProMember } = usePurchases();

  const [history, setHistory] = useState<PredictionData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  const tierKey = user?.tier ?? 'rookie';
  const tierInfo = TIER_CONFIG[tierKey] ?? TIER_CONFIG.rookie;
  const totalPoints = user?.totalPoints ?? 0;
  const rankPercent = tierInfo.max > 0 ? Math.min((totalPoints / tierInfo.max) * 100, 100) : 0;

  const totalPredictions = user?.totalPredictions ?? 0;
  const correctPredictions = user?.correctPredictions ?? 0;
  const winRate = totalPredictions > 0
    ? Math.round((correctPredictions / totalPredictions) * 100)
    : 0;
  const activeStreak = user?.currentStreak ?? 0;

  const fetchHistory = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await predictionsApi.getMyPicks(tokens.accessToken, { status: 'resolved', limit: 6 });
      setHistory(res.predictions);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [tokens?.accessToken]);

  const fetchAchievements = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const data = await achievementsApi.getMyAchievements(tokens.accessToken);
      setAchievements(data);
    } catch {
      // silent
    } finally {
      setAchievementsLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchHistory();
    fetchAchievements();
  }, [fetchHistory, fetchAchievements]);

  const handleLogout = async () => {
    await logout();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('profile.shareText', { rate: winRate }),
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Profile Hero ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroContent}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarLarge}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={48} color={colors.onSurfaceVariant} />
                )}
              </View>
              {isProMember && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>

            {/* Name & Tier */}
            <Text style={styles.username}>{user?.displayName ?? 'GHOSTKING'}</Text>
            <Text style={styles.tierLabel}>
              {isProMember ? t('profile.proTier') : t('profile.freeTier')}
            </Text>

            {/* Meta */}
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={12}
                color={colors.onSurfaceVariant}
              />
              <Text style={styles.metaText}>{t('profile.pts', { count: totalPoints.toLocaleString() })}</Text>
            </View>
            {user?.email && (
              <View style={styles.metaRow}>
                <Ionicons name="mail-outline" size={12} color={colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{user.email.toUpperCase()}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.heroActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.editBtnWrap}
                onPress={() => profileNav.navigate('EditProfile')}
              >
                <LinearGradient
                  colors={['#F3FFCA', '#CAFD00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.editBtn}
                >
                  <Text style={styles.editBtnText}>{t('profile.editProfile')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Feather name="share-2" size={18} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Rank Progress ── */}
        <View style={styles.statCard}>
          <View style={styles.rankHeader}>
            <View style={{ gap: 4 }}>
              <Text style={styles.statMiniLabel}>{t('profile.currentStanding')}</Text>
              <Text style={styles.rankValue}>{tierInfo.label.toUpperCase()}</Text>
            </View>
            <View style={{ gap: 4, alignItems: 'flex-end' }}>
              {tierInfo.next ? (
                <Text style={styles.statMiniLabel}>{t('leaderboard.nextTier', { tier: tierInfo.next.toUpperCase() })}</Text>
              ) : (
                <Text style={styles.statMiniLabel}>{t('leaderboard.maxTier')}</Text>
              )}
              <Text style={styles.rankProgress}>
                {totalPoints.toLocaleString()} /{' '}
                {tierInfo.max.toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#F3FFCA', '#CAFD00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.progressFill, { width: `${rankPercent}%` }]}
            >
              <View style={styles.progressEdge} />
            </LinearGradient>
          </View>
        </View>

        {/* ── Win Rate ── */}
        <View style={[styles.statCard, styles.statCardCenter]}>
          <Text style={styles.statMiniLabel}>{t('profile.winRate')}</Text>
          <Text style={styles.bigStat}>{winRate}%</Text>
          <Text style={styles.statDelta}>
            {t('profile.totalPredictions', { count: totalPredictions })}
          </Text>
        </View>

        {/* ── Total Correct ── */}
        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={styles.statIconBox}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primaryContainer} />
            </View>
            <Text style={styles.statMiniLabel}>{t('profile.totalCorrect')}</Text>
          </View>
          <Text style={styles.bigStatLeft}>{correctPredictions}</Text>
        </View>

        {/* ── Active Streak ── */}
        <View style={[styles.statCard, styles.streakCard]}>
          <View style={styles.statIconRow}>
            <View style={styles.streakIconBox}>
              <MaterialCommunityIcons name="fire" size={18} color={colors.tertiaryLight} />
            </View>
            <Text style={styles.statMiniLabel}>{t('profile.activeStreak')}</Text>
          </View>
          <Text style={styles.streakValue}>
            {activeStreak}{' '}
            <Text style={styles.streakUnit}>{t('profile.matches')}</Text>
          </Text>
        </View>

        {/* ── Subscription ── */}
        <View style={styles.statCard}>
          <View style={styles.subHeader}>
            <Text style={styles.statMiniLabel}>{t('profile.kineticPlus')}</Text>
            <View style={isProMember ? styles.activeBadge : styles.inactiveBadge}>
              <Text style={isProMember ? styles.activeBadgeText : styles.inactiveBadgeText}>
                {isProMember ? t('profile.active') : t('profile.inactive')}
              </Text>
            </View>
          </View>
          <View style={{ gap: 8, marginTop: 16 }}>
            {isProMember ? (
              <>
                <Text style={styles.subPrice}>
                  Kinetic+
                  <Text style={styles.subPriceUnit}> {t('profile.subscription')}</Text>
                </Text>
                <TouchableOpacity onPress={() => rootNav.navigate('Paywall', { trigger: 'general' })}>
                  <Text style={styles.manageSub}>{t('profile.manageSubscription')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subDesc}>
                  {t('profile.subDesc')}
                </Text>
                <TouchableOpacity
                  style={styles.upgradeBtnWrap}
                  activeOpacity={0.85}
                  onPress={() => rootNav.navigate('Paywall', { trigger: 'general' })}
                >
                  <LinearGradient
                    colors={['#F3FFCA', '#CAFD00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.upgradeBtn}
                  >
                    <Text style={styles.upgradeBtnText}>{t('profile.upgradeToPro')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Achievements ── */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="medal" size={18} color={colors.onSurface} />
          <Text style={styles.sectionTitle}>{t('profile.achievements')}</Text>
          {achievements.length > 0 && (
            <View style={styles.achieveCounter}>
              <Text style={styles.achieveCounterText}>
                {achievements.filter((a) => a.unlocked).length}/{achievements.length}
              </Text>
            </View>
          )}
        </View>
        {/* Summary bar */}
        {!achievementsLoading && achievements.length > 0 && (
          <View style={styles.achieveSummary}>
            <View style={styles.achieveSummaryTrack}>
              <View
                style={[
                  styles.achieveSummaryFill,
                  {
                    width: `${Math.round(
                      (achievements.filter((a) => a.unlocked).length / achievements.length) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.achieveSummaryText}>
              {t('profile.ptsEarned', { count: achievements.reduce((sum, a) => sum + (a.unlocked ? a.points : 0), 0) })}
            </Text>
          </View>
        )}
        {achievementsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : achievements.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={styles.achieveDesc}>{t('profile.noAchievements')}</Text>
          </View>
        ) : (
          achievements.map((a) => {
            const progressPct =
              a.progress && a.progress.target > 0
                ? Math.min((a.progress.current / a.progress.target) * 100, 100)
                : a.unlocked
                  ? 100
                  : 0;

            return (
              <View
                key={a.key}
                style={[
                  styles.achieveCard,
                  a.unlocked && styles.achieveCardUnlocked,
                ]}
              >
                <AchievementIcon item={a} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={[
                        styles.achieveTitle,
                        !a.unlocked && { color: 'rgba(248,249,254,0.5)' },
                      ]}
                    >
                      {a.title}
                    </Text>
                    {a.unlocked && (
                      <View style={styles.achieveUnlockedBadge}>
                        <Ionicons name="checkmark" size={11} color="#E3FFE4" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.achieveDesc}>{a.description}</Text>

                  {/* Progress bar */}
                  {!a.unlocked && a.progress && a.progress.target > 0 && (
                    <View style={styles.achieveProgressRow}>
                      <View style={styles.achieveProgressTrack}>
                        <View
                          style={[
                            styles.achieveProgressFill,
                            { width: `${progressPct}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.achieveProgressText}>
                        {a.progress.current}/{a.progress.target}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.achievePoints}>
                    {a.unlocked ? t('profile.ptsEarnedBadge', { count: a.points }) : t('profile.pts', { count: a.points })}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* ── Prediction History ── */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <MaterialCommunityIcons
            name="history"
            size={18}
            color={colors.onSurface}
          />
          <Text style={styles.sectionTitle}>{t('profile.predictionHistory')}</Text>
        </View>
        {historyLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : history.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={styles.historyOutcome}>{t('profile.noPredictions')}</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((p) => {
              const isWin = p.status === 'won';
              return (
                <View key={p._id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <View
                      style={[
                        styles.historyIcon,
                        {
                          backgroundColor: isWin
                            ? 'rgba(0,109,55,0.2)'
                            : 'rgba(185,41,2,0.2)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isWin ? 'trending-up' : 'trending-down'}
                        size={20}
                        color={isWin ? '#5BEF90' : '#FF7351'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyLabel}>
                        {p.homeTeamName} VS {p.awayTeamName}
                      </Text>
                      <Text style={styles.historyOutcome}>
                        {t('profile.outcome')}: {p.status === 'won' ? t('profile.win') : p.status === 'lost' ? t('profile.loss') : p.status.toUpperCase()} · {formatOutcome(p, t)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.historyPts,
                        { color: isWin ? colors.primaryContainer : '#FF7351' },
                      ]}
                    >
                      {isWin ? `+${p.pointsAwarded}` : '0'} {t('profile.ptsUnit')}
                    </Text>
                    <Text style={styles.historyTime}>
                      {formatPickDate(p.createdAt, t)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Preferences ── */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsLabel}>{t('profile.preferences')}</Text>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => profileNav.navigate('EditFavoriteSports')}
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="football" size={18} color={colors.onSurface} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsRowText}>{t('profile.favoriteSports')}</Text>
                {user?.favoriteSports && user.favoriteSports.length > 0 && (
                  <Text style={styles.prefsSubtext}>
                    {t('profile.sportsSelected', { count: user.favoriteSports.length })}
                  </Text>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => profileNav.navigate('EditFavoriteLeagues')}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.onSurface} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsRowText}>{t('profile.favoriteLeagues')}</Text>
                {user?.favoriteLeagues && user.favoriteLeagues.length > 0 && (
                  <Text style={styles.prefsSubtext}>
                    {t('profile.leaguesSelected', { count: user.favoriteLeagues.length })}
                  </Text>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* ── Security & Settings ── */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsLabel}>{t('profile.securitySettings')}</Text>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => profileNav.navigate('Notifications')}
          >
            <View style={styles.settingsRowLeft}>
              <Feather name="bell" size={18} color={colors.onSurface} />
              <Text style={styles.settingsRowText}>{t('notifications.title')}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => profileNav.navigate('SecurityPrivacy')}
          >
            <View style={styles.settingsRowLeft}>
              <Feather name="shield" size={18} color={colors.onSurface} />
              <Text style={styles.settingsRowText}>{t('security.title')}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => profileNav.navigate('WalletRewards')}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialCommunityIcons
                name="wallet-outline"
                size={18}
                color={colors.onSurface}
              />
              <Text style={styles.settingsRowText}>{t('wallet.title')}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color="#FF7351" />
            <Text style={styles.logoutBtnText}>{t('profile.logOut')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },

  // Hero
  heroCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.1)',
    padding: 33,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroGlow: {
    position: 'absolute',
    top: -64,
    right: -64,
    width: 256,
    height: 256,
    borderRadius: 12,
    backgroundColor: 'rgba(243,255,202,0.05)',
  },
  heroContent: {
    alignItems: 'center',
    gap: 8,
  },
  avatarWrap: {
    marginBottom: 8,
  },
  avatarLarge: {
    width: 128,
    height: 128,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 128,
    height: 128,
    borderRadius: 6,
  },
  proBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  proBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: '#3A4A00',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  username: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: colors.onSurface,
    letterSpacing: -1.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tierLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.primary,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  editBtnWrap: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  editBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 4,
  },
  editBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: '#4A5E00',
    letterSpacing: -0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  shareBtn: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stat Cards
  statCard: {
    marginHorizontal: 16,
    backgroundColor: '#161A1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.1)',
    padding: 25,
    marginBottom: 16,
  },
  statCardCenter: {
    alignItems: 'center',
  },
  rankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rankValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.primaryContainer,
    textTransform: 'uppercase',
  },
  rankProgress: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
    textAlign: 'right',
  },
  progressTrack: {
    height: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  progressEdge: {
    width: 4,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  statMiniLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bigStat: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 48,
    lineHeight: 48,
    color: colors.primaryContainer,
    textAlign: 'center',
    marginVertical: 8,
  },
  bigStatLeft: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: colors.onSurface,
    marginTop: 16,
  },
  statDelta: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: '#5BEF90',
    textAlign: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(243,255,202,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Streak
  streakCard: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: 'rgba(243,255,202,0.2)',
    overflow: 'hidden',
  },
  streakIconBox: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(255,116,57,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: colors.tertiaryLight,
    marginTop: 16,
  },
  streakUnit: {
    fontSize: 18,
    lineHeight: 28,
  },

  // Subscription
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadge: {
    backgroundColor: '#006D37',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: '#E3FFE4',
  },
  subPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  subPriceUnit: {
    fontFamily: 'Inter_400Regular',
    color: colors.onSurfaceVariant,
  },
  manageSub: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.primaryContainer,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(243,255,202,0.3)',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(255,115,81,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inactiveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: '#FF7351',
  },
  subDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  upgradeBtnWrap: {
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  upgradeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: '#4A5E00',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
  },

  // Achievements
  achieveCounter: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  achieveCounterText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  achieveSummary: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achieveSummaryTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(69,72,76,0.2)',
    overflow: 'hidden',
  },
  achieveSummaryFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  achieveSummaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  achieveCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.08)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  achieveCardUnlocked: {
    borderColor: 'rgba(202,253,0,0.15)',
    backgroundColor: 'rgba(202,253,0,0.04)',
  },
  achieveIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achieveTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  achieveDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  achieveProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  achieveProgressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(69,72,76,0.2)',
    overflow: 'hidden',
  },
  achieveProgressFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  achieveProgressText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: 'rgba(248,249,254,0.5)',
    minWidth: 36,
    textAlign: 'right',
  },
  achievePoints: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.primaryContainer,
    letterSpacing: 1,
    marginTop: 4,
  },
  achieveUnlockedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#006D37',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // History
  historyList: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.05)',
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  historyOutcome: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
  },
  historyPts: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'right',
  },
  historyTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    textAlign: 'right',
  },

  // Settings
  settingsSection: {
    paddingHorizontal: 16,
    marginTop: 32,
    gap: 16,
  },
  settingsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  settingsRow: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.1)',
    padding: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsRowText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
    letterSpacing: -0.4,
    textTransform: 'uppercase',
  },
  prefsSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,115,81,0.2)',
    marginTop: 8,
  },
  logoutBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: '#FF7351',
    letterSpacing: -0.4,
    textTransform: 'uppercase',
  },
});
