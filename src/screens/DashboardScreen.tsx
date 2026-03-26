import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { HomeStackParamList } from '../navigation/types';
import { AppHeader } from '../components/AppHeader';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'DashboardHome'>;
};

const SPORTS_TABS = [
  { label: 'All', icon: null },
  { label: 'Football', icon: 'football' as const },
  { label: 'Basketball', icon: 'basketball' as const },
  { label: 'Tennis', icon: 'tennis' as const },
];

const FAVORITES = [
  { name: 'Real Madrid', league: 'La Liga', sport: 'football' },
  { name: 'LA Lakers', league: 'NBA', sport: 'basketball' },
];

const FOLLOWED_SPORTS = [
  'Champions\nLeague',
  'Premier\nLeague',
  'Grand\nSlam',
  'UFC\nMain\nEvents',
];

const UPCOMING_GAMES = [
  {
    league: 'CHAMPIONS LEAGUE \u2022 TODAY 21:00',
    team1: 'Real Madrid',
    team2: 'Man City',
    sport1: 'football',
    sport2: 'football',
    odds: [
      { label: 'EASY', pts: '+15 pts' },
      { label: 'HARD', pts: '+40 pts' },
      { label: 'MEDIUM', pts: '+25 pts' },
    ],
  },
  {
    league: 'NBA \u2022 TOMORROW 02:00',
    team1: 'LA Lakers',
    team2: 'GS Warriors',
    sport1: 'basketball',
    sport2: 'basketball',
    odds: [
      { label: 'MEDIUM', pts: '+25 pts' },
      { label: 'EASY', pts: '+15 pts' },
    ],
  },
];

const LIVE_MATCHES = [
  {
    sport: 'PREMIER LEAGUE',
    badge: "LIVE 64'",
    rows: [
      { name: 'Arsenal', sets: '', score: '2', isServing: true },
      { name: 'Liverpool', sets: '', score: '1', isServing: false },
    ],
    prediction: '+20 pts',
  },
  {
    sport: 'TENNIS \u2022 ATP\nPARIS',
    badge: 'LIVE\nQ3',
    rows: [
      { name: 'Alcaraz C.', sets: '6 4', score: '40', isServing: true },
      { name: 'Sinner J.', sets: '3 6', score: '15', isServing: false },
    ],
    prediction: '+20 pts',
  },
];

const CHALLENGE_ITEMS = [
  'Real Madrid win prediction',
  'Bayern Munich Over 1.5 Goals',
  'Inter Milan Clean Sheet',
];

const TRENDING = [
  {
    title: 'LeBron James Over 28.5\nPoints',
    subtitle: 'BASKETBALL \u2022 LAKERS VS\nWARRIORS',
    points: '+19\npts',
    icon: 'basketball' as const,
  },
  {
    title: 'Liverpool to Qualify',
    subtitle: 'FOOTBALL \u2022 CHAMPIONS\nLEAGUE',
    points: '+24\npts',
    icon: 'football' as const,
  },
];

function getSportIcon(sport: string, size: number, color: string) {
  if (sport === 'football') {
    return <Ionicons name="football" size={size} color={color} />;
  }
  if (sport === 'basketball') {
    return <MaterialCommunityIcons name="basketball" size={size} color={color} />;
  }
  return null;
}

export function DashboardScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState('All');

  return (
    <View style={styles.container}>
      <AppHeader />

      {/* Sports Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {SPORTS_TABS.map((tab) => {
          const isActive = activeTab === tab.label;
          const iconColor = isActive ? '#4A5E00' : colors.onSurface;
          return (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.label)}
            >
              <View style={styles.tabInner}>
                {tab.icon === 'football' && (
                  <Ionicons name="football" size={13} color={iconColor} />
                )}
                {tab.icon === 'basketball' && (
                  <MaterialCommunityIcons name="basketball" size={13} color={iconColor} />
                )}
                {tab.icon === 'tennis' && (
                  <MaterialCommunityIcons name="tennis" size={13} color={iconColor} />
                )}
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* ── Top Predictor Card ── */}
        <View style={styles.predictorCard}>
          <View style={styles.predictorGlow} />
          <View>
            <Text style={styles.predictorTitle}>Top Predictor</Text>
            <Text style={styles.predictorSubtitle}>
              Pro Tier Member {'\u2022'}{' '}
              <Text style={styles.predictorPts}>1,250 PTS</Text>
            </Text>
          </View>

          <View style={styles.goalBlock}>
            <View style={styles.goalLabelRow}>
              <Text style={styles.goalLabel}>DAILY GOAL: 3 CORRECT PICKS</Text>
              <Text style={styles.goalRatio}>2/3</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[colors.primaryContainer, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.progressFill, { width: '66%' }]}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.viewQuestsBtn}>
            <Text style={styles.viewQuestsLabel}>VIEW QUESTS</Text>
          </TouchableOpacity>
        </View>

        {/* ── Favorites ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star" size={20} color={colors.primary} />
            <Text style={styles.sectionHeading}>FAVORITES</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favRow}
          >
            {FAVORITES.map((fav) => (
              <View key={fav.name} style={styles.favCard}>
                <View style={styles.favIcon}>
                  {getSportIcon(fav.sport, 18, colors.onSurface)}
                </View>
                <View>
                  <Text style={styles.favName}>{fav.name}</Text>
                  <Text style={styles.favLeague}>{fav.league}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.followedBlock}>
            <Text style={styles.followedLabel}>FOLLOWED SPORTS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.followedRow}
            >
              {FOLLOWED_SPORTS.map((sport) => (
                <View key={sport} style={styles.followedChip}>
                  <Text style={styles.followedChipText}>{sport}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ── Upcoming Thrillers ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.thrillersHeaderRow}>
            <Text style={styles.thrillersHeading}>UPCOMING THRILLERS</Text>
            <TouchableOpacity>
              <Text style={styles.viewScheduleLink}>VIEW SCHEDULE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gameCardsRow}
          >
            {UPCOMING_GAMES.map((game, idx) => (
              <View key={idx} style={styles.gameCard}>
                <View style={styles.gameCardTop}>
                  <Text style={styles.gameCardLeague}>{game.league}</Text>
                  <TouchableOpacity>
                    <Ionicons name="star-outline" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                <View style={styles.gameTeamsRow}>
                  <View style={styles.gameTeamCol}>
                    <View style={styles.gameTeamBadge}>
                      {getSportIcon(game.sport1, 22, colors.onSurface)}
                    </View>
                    <Text style={styles.gameTeamName}>{game.team1}</Text>
                  </View>
                  <Text style={styles.gameVsLabel}>VS</Text>
                  <View style={styles.gameTeamCol}>
                    <View style={styles.gameTeamBadge}>
                      {getSportIcon(game.sport2, 22, colors.onSurface)}
                    </View>
                    <Text style={styles.gameTeamName}>{game.team2}</Text>
                  </View>
                </View>

                <View style={styles.oddsRow}>
                  {game.odds.map((odd, oidx) => (
                    <TouchableOpacity key={oidx} style={styles.oddBtn}>
                      <Text style={styles.oddLabel}>{odd.label}</Text>
                      <Text style={styles.oddPts}>{odd.pts}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Live Action ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.liveHeaderRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveSectionTitle}>LIVE ACTION</Text>
          </View>

          {LIVE_MATCHES.map((match, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.liveCard}
              onPress={() => navigation.navigate('MatchPrediction')}
              activeOpacity={0.7}
            >
              <View style={styles.liveAccent} />
              <View style={styles.liveBody}>
                <View style={styles.liveBadgeRow}>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>{match.badge}</Text>
                  </View>
                  <Text style={styles.liveLeagueText}>{match.sport}</Text>
                </View>
                <View style={styles.liveScoresBlock}>
                  {match.rows.map((row, ridx) => (
                    <View key={ridx} style={styles.liveTeamRow}>
                      <View style={styles.liveTeamLeft}>
                        <View
                          style={[
                            styles.servingDot,
                            !row.isServing && styles.servingDotHidden,
                          ]}
                        />
                        <Text style={styles.liveTeamName}>{row.name}</Text>
                      </View>
                      <View style={styles.liveScoreGroup}>
                        {row.sets ? (
                          <Text style={styles.liveSetsText}>{row.sets}</Text>
                        ) : null}
                        <Text style={styles.liveScoreValue}>{row.score}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.livePredictCol}>
                <Text style={styles.predictLiveLabel}>PREDICT LIVE NOW</Text>
                <View style={styles.predictPtsBtn}>
                  <Text style={styles.predictPtsBtnText}>{match.prediction}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Challenge of the Day ── */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeGlow} />

          <View style={styles.challengeTitleRow}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={styles.challengeHeading}>CHALLENGE OF THE DAY</Text>
          </View>

          <View style={styles.challengeContent}>
            <Text style={styles.challengeBoostTag}>DOUBLE BOOST</Text>
            <Text style={styles.challengeName}>
              European Giants{'\n'}Challenge
            </Text>

            <View style={styles.challengeChecklist}>
              {CHALLENGE_ITEMS.map((item, idx) => (
                <View key={idx} style={styles.challengeCheckRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text style={styles.challengeCheckText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.challengeScoreBox}>
            <View style={styles.challengeScoreTopRow}>
              <Text style={styles.challengeOldPrice}>420 PTS</Text>
              <Text style={styles.challengeComboBonus}>+25% Combo Bonus</Text>
            </View>
            <View style={styles.challengeScoreBottomRow}>
              <Text style={styles.challengeMaxLabel}>Max Score:</Text>
              <Text style={styles.challengeMaxValue}>525 pts</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.submitWrap}>
            <LinearGradient
              colors={[colors.primaryContainer, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
              <Text style={styles.submitBtnText}>SUBMIT PICKS</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Trending Now ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.trendingHeading}>TRENDING NOW</Text>

          <View style={styles.trendingList}>
            {TRENDING.map((item, idx) => (
              <View key={idx} style={styles.trendingRow}>
                <View style={styles.trendingLeft}>
                  <View style={styles.trendingIconBox}>
                    {getSportIcon(item.icon, 20, colors.onSurface)}
                  </View>
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingItemTitle}>{item.title}</Text>
                    <Text style={styles.trendingItemSub}>{item.subtitle}</Text>
                  </View>
                </View>
                <View style={styles.trendingPtsBadge}>
                  <Text style={styles.trendingPtsText}>{item.points}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.fabWrap, { bottom: 16 }]}
      >
        <LinearGradient
          colors={[colors.primaryContainer, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={24} color="#4A5E00" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Sports Filter Tabs ──
  tabsScroll: {
    maxHeight: 40,
    marginBottom: 8,
  },
  tabsContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
  },
  tabLabelActive: {
    color: '#4A5E00',
  },

  scrollView: {
    flex: 1,
  },

  sectionWrap: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  // ── Top Predictor ──
  predictorCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    overflow: 'hidden',
    gap: 12,
  },
  predictorGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(202,253,0,0.04)',
  },
  predictorTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.primaryContainer,
    letterSpacing: -0.5,
  },
  predictorSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  predictorPts: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  goalBlock: {
    gap: 8,
  },
  goalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  goalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalRatio: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.primaryContainer,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  viewQuestsBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.1)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  viewQuestsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    textAlign: 'center',
  },

  // ── Favorites ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
  },
  favRow: {
    gap: 12,
    paddingRight: 16,
  },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.05)',
    borderRadius: 8,
    paddingVertical: 13,
    paddingLeft: 17,
    paddingRight: 20,
    gap: 12,
    minWidth: 180,
  },
  favIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
  },
  favLeague: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  followedBlock: {
    marginTop: 16,
    gap: 12,
  },
  followedLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  followedRow: {
    gap: 8,
  },
  followedChip: {
    backgroundColor: 'rgba(34,38,43,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.1)',
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followedChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    textAlign: 'center',
  },

  // ── Upcoming Thrillers ──
  thrillersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingTop: 8,
  },
  thrillersHeading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
    letterSpacing: -0.6,
    textTransform: 'uppercase',
  },
  viewScheduleLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gameCardsRow: {
    gap: 16,
  },
  gameCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 24,
    minWidth: 300,
    gap: 24,
  },
  gameCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gameCardLeague: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  gameTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  gameTeamBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTeamName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    textAlign: 'center',
  },
  gameVsLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  oddsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  oddBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingVertical: 8,
    alignItems: 'center',
  },
  oddLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  oddPts: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },

  // ── Live Action ──
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 12,
    backgroundColor: colors.tertiaryLight,
  },
  liveSectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
  },
  liveCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  liveAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(243,255,202,0.2)',
  },
  liveBody: {
    flex: 1,
    gap: 12,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveBadge: {
    backgroundColor: 'rgba(255,116,57,0.1)',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.tertiaryLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveLeagueText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveScoresBlock: {
    gap: 8,
  },
  liveTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 32,
  },
  liveTeamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servingDot: {
    width: 6,
    height: 6,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  servingDotHidden: {
    opacity: 0,
  },
  liveTeamName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  liveScoreGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  liveSetsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  liveScoreValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
  },
  livePredictCol: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 140,
  },
  predictLiveLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.primaryContainer,
    letterSpacing: -0.25,
    textTransform: 'uppercase',
  },
  predictPtsBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    height: 40,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictPtsBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    textAlign: 'center',
  },

  // ── Challenge of the Day ──
  challengeCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(243,255,202,0.1)',
    padding: 25,
    marginBottom: 24,
    overflow: 'hidden',
  },
  challengeGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(243,255,202,0.03)',
  },
  challengeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  challengeHeading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.45,
    textTransform: 'uppercase',
  },
  challengeContent: {
    marginBottom: 32,
  },
  challengeBoostTag: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  challengeName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: colors.primaryContainer,
    marginBottom: 12,
  },
  challengeChecklist: {
    gap: 12,
  },
  challengeCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeCheckText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  challengeScoreBox: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 8,
    padding: 16,
    gap: 4,
    marginBottom: 24,
  },
  challengeScoreTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeOldPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textDecorationLine: 'line-through',
  },
  challengeComboBonus: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.tertiaryLight,
    letterSpacing: 1.2,
  },
  challengeScoreBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeMaxLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  challengeMaxValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.primaryContainer,
  },
  submitWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: 'rgba(202,253,0,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  submitBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  submitBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: '#4A5E00',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ── Trending Now ──
  trendingHeading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
    letterSpacing: -0.6,
    textTransform: 'uppercase',
    marginBottom: 16,
    paddingTop: 16,
  },
  trendingList: {
    gap: 12,
  },
  trendingRow: {
    backgroundColor: 'rgba(16,20,23,0.5)',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  trendingIconBox: {
    width: 36,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingInfo: {
    flex: 1,
  },
  trendingItemTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  trendingItemSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  trendingPtsBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingPtsText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: colors.primaryContainer,
    textAlign: 'center',
  },

  // ── FAB ──
  fabWrap: {
    position: 'absolute',
    right: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
