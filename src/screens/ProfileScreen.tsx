import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
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
import { ProfileStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchasesContext';

const TIER_CONFIG: Record<string, { label: string; next: string; max: number }> = {
  rookie: { label: 'Rookie', next: 'Bronze', max: 1000 },
  bronze: { label: 'Bronze', next: 'Silver', max: 5000 },
  silver: { label: 'Silver', next: 'Gold', max: 10000 },
  gold: { label: 'Gold', next: 'Diamond', max: 25000 },
  diamond: { label: 'Diamond', next: 'Legend', max: 50000 },
  legend: { label: 'Legend', next: '', max: 100000 },
};

const ACHIEVEMENTS = [
  {
    id: '1',
    title: 'Premier Prodigy',
    desc: '10 Consecutive Premier League Wins',
    iconName: 'trophy' as const,
    bgType: 'gradient' as const,
  },
  {
    id: '2',
    title: 'Hardwood Hero',
    desc: 'Predicted NBA Playoff Sweep',
    iconName: 'basketball' as const,
    bgType: 'orange' as const,
  },
  {
    id: '3',
    title: 'Ultimate Kineticist',
    desc: 'Earned 10,000 pts in a single week',
    iconName: 'flash' as const,
    bgType: 'outline' as const,
  },
];

const HISTORY = [
  {
    id: '1',
    label: 'MCI VS ARS \u2022 OVER 2.5',
    outcome: 'Outcome: WIN',
    pts: '+450 PTS',
    ptsColor: colors.primaryContainer,
    time: '2H AGO',
    isWin: true,
  },
  {
    id: '2',
    label: 'LAL VS GSW \u2022 CURRY\nO/28.5',
    outcome: 'Outcome: WIN',
    pts: '+220\nPTS',
    ptsColor: colors.primaryContainer,
    time: 'YESTERDAY',
    isWin: true,
  },
  {
    id: '3',
    label: 'NYY VS BOS \u2022 RED SOX ML',
    outcome: 'Outcome: LOSS',
    pts: '-150 PTS',
    ptsColor: '#FF7351',
    time: '2D AGO',
    isWin: false,
  },
];

// ── Achievement Icon ──

function AchievementIcon({ item }: { item: typeof ACHIEVEMENTS[0] }) {
  const iconSize = 20;
  const iconColor = item.bgType === 'gradient' ? '#4A5E00' : '#FFFFFF';

  const icon =
    item.iconName === 'trophy' ? (
      <Ionicons name="trophy" size={iconSize} color={iconColor} />
    ) : item.iconName === 'basketball' ? (
      <Ionicons name="basketball" size={iconSize} color={iconColor} />
    ) : (
      <Ionicons name="flash" size={iconSize} color={colors.primary} />
    );

  if (item.bgType === 'gradient') {
    return (
      <LinearGradient
        colors={['#F3FFCA', '#CAFD00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.achieveIconWrap}
      >
        {icon}
      </LinearGradient>
    );
  }

  if (item.bgType === 'orange') {
    return (
      <View style={[styles.achieveIconWrap, { backgroundColor: colors.tertiaryLight }]}>
        {icon}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.achieveIconWrap,
        {
          backgroundColor: colors.surfaceContainerHighest,
          borderWidth: 1,
          borderColor: 'rgba(202,253,0,0.3)',
        },
      ]}
    >
      {icon}
    </View>
  );
}

// ── Main Screen ──

export function ProfileScreen() {
  const profileNav = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { logout, user } = useAuth();
  const { isProMember, presentPaywall } = usePurchases();

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

  const handleLogout = async () => {
    await logout();
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
                <Ionicons name="person" size={48} color={colors.onSurfaceVariant} />
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
              {isProMember ? 'PRO TIER MEMBER' : 'FREE TIER'}
            </Text>

            {/* Meta */}
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={12}
                color={colors.onSurfaceVariant}
              />
              <Text style={styles.metaText}>{totalPoints.toLocaleString()} PTS</Text>
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
                  <Text style={styles.editBtnText}>EDIT PROFILE</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn}>
                <Feather name="share-2" size={18} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Rank Progress ── */}
        <View style={styles.statCard}>
          <View style={styles.rankHeader}>
            <View style={{ gap: 4 }}>
              <Text style={styles.statMiniLabel}>CURRENT STANDING</Text>
              <Text style={styles.rankValue}>{tierInfo.label.toUpperCase()}</Text>
            </View>
            <View style={{ gap: 4, alignItems: 'flex-end' }}>
              {tierInfo.next ? (
                <Text style={styles.statMiniLabel}>NEXT: {tierInfo.next.toUpperCase()}</Text>
              ) : (
                <Text style={styles.statMiniLabel}>MAX TIER</Text>
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
          <Text style={styles.statMiniLabel}>WIN RATE</Text>
          <Text style={styles.bigStat}>{winRate}%</Text>
          <Text style={styles.statDelta}>
            {totalPredictions} TOTAL PREDICTIONS
          </Text>
        </View>

        {/* ── Total Correct ── */}
        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={styles.statIconBox}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primaryContainer} />
            </View>
            <Text style={styles.statMiniLabel}>TOTAL CORRECT</Text>
          </View>
          <Text style={styles.bigStatLeft}>{correctPredictions}</Text>
        </View>

        {/* ── Active Streak ── */}
        <View style={[styles.statCard, styles.streakCard]}>
          <View style={styles.statIconRow}>
            <View style={styles.streakIconBox}>
              <MaterialCommunityIcons name="fire" size={18} color={colors.tertiaryLight} />
            </View>
            <Text style={styles.statMiniLabel}>ACTIVE STREAK</Text>
          </View>
          <Text style={styles.streakValue}>
            {activeStreak}{' '}
            <Text style={styles.streakUnit}>MATCHES</Text>
          </Text>
        </View>

        {/* ── Subscription ── */}
        <View style={styles.statCard}>
          <View style={styles.subHeader}>
            <Text style={styles.statMiniLabel}>KINETIC+</Text>
            <View style={isProMember ? styles.activeBadge : styles.inactiveBadge}>
              <Text style={isProMember ? styles.activeBadgeText : styles.inactiveBadgeText}>
                {isProMember ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
          <View style={{ gap: 8, marginTop: 16 }}>
            {isProMember ? (
              <>
                <Text style={styles.subPrice}>
                  Kinetic+
                  <Text style={styles.subPriceUnit}> subscription</Text>
                </Text>
                <TouchableOpacity onPress={presentPaywall}>
                  <Text style={styles.manageSub}>MANAGE SUBSCRIPTION</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subDesc}>
                  Unlock premium predictions, exclusive insights, and ad-free
                  experience.
                </Text>
                <TouchableOpacity
                  style={styles.upgradeBtnWrap}
                  activeOpacity={0.85}
                  onPress={presentPaywall}
                >
                  <LinearGradient
                    colors={['#F3FFCA', '#CAFD00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.upgradeBtn}
                  >
                    <Text style={styles.upgradeBtnText}>UPGRADE TO PRO</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Recent Achievements ── */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="medal" size={18} color={colors.onSurface} />
          <Text style={styles.sectionTitle}>RECENT ACHIEVEMENTS</Text>
        </View>
        {ACHIEVEMENTS.map((a) => (
          <View key={a.id} style={styles.achieveCard}>
            <AchievementIcon item={a} />
            <View style={{ flex: 1 }}>
              <Text style={styles.achieveTitle}>{a.title}</Text>
              <Text style={styles.achieveDesc}>{a.desc}</Text>
            </View>
          </View>
        ))}

        {/* ── Prediction History ── */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <MaterialCommunityIcons
            name="history"
            size={18}
            color={colors.onSurface}
          />
          <Text style={styles.sectionTitle}>PREDICTION HISTORY</Text>
        </View>
        <View style={styles.historyList}>
          {HISTORY.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <View
                  style={[
                    styles.historyIcon,
                    {
                      backgroundColor: h.isWin
                        ? 'rgba(0,109,55,0.2)'
                        : 'rgba(185,41,2,0.2)',
                    },
                  ]}
                >
                  <Ionicons
                    name={h.isWin ? 'trending-up' : 'trending-down'}
                    size={20}
                    color={h.isWin ? '#5BEF90' : '#FF7351'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyLabel}>{h.label}</Text>
                  <Text style={styles.historyOutcome}>{h.outcome}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.historyPts, { color: h.ptsColor }]}>
                  {h.pts}
                </Text>
                <Text style={styles.historyTime}>{h.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Security & Settings ── */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsLabel}>SECURITY & SETTINGS</Text>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => profileNav.navigate('Notifications')}
          >
            <View style={styles.settingsRowLeft}>
              <Feather name="bell" size={18} color={colors.onSurface} />
              <Text style={styles.settingsRowText}>NOTIFICATIONS</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => profileNav.navigate('SecurityPrivacy')}
          >
            <View style={styles.settingsRowLeft}>
              <Feather name="shield" size={18} color={colors.onSurface} />
              <Text style={styles.settingsRowText}>SECURITY & PRIVACY</Text>
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
              <Text style={styles.settingsRowText}>WALLET & REWARDS</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color="#FF7351" />
            <Text style={styles.logoutBtnText}>LOG OUT</Text>
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
  achieveCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.05)',
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  achieveIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achieveTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
    letterSpacing: -0.4,
    textTransform: 'uppercase',
  },
  achieveDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
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
