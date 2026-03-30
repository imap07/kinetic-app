import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { predictionsApi } from '../api/predictions';
import type { DailyStatusResponse, QuestProgress } from '../api/predictions';
import type { HomeStackParamList } from '../navigation/types';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<HomeStackParamList, 'Quests'>;

interface QuestDef {
  id: keyof QuestProgress | string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  target: number;
  getProgress: (q?: QuestProgress) => number;
  isDone: (q?: QuestProgress) => boolean;
}

const DAILY_QUESTS: QuestDef[] = [
  {
    id: 'pick3',
    title: 'Pick 3 correct outcomes',
    description: 'Get 3 predictions right today',
    icon: 'checkmark-done',
    target: 3,
    getProgress: (q) => q?.pick3?.progress ?? 0,
    isDone: (q) => q?.pick3?.completed ?? false,
  },
  {
    id: 'multiSport',
    title: 'Cover at least 2 sports',
    description: 'Make predictions in 2 different sports',
    icon: 'football',
    target: 2,
    getProgress: (q) => q?.multiSport?.progress ?? 0,
    isDone: (q) => q?.multiSport?.completed ?? false,
  },
  {
    id: 'bonusReward',
    title: 'Earn bonus rewards',
    description: 'Complete all daily quests for a bonus',
    icon: 'gift',
    target: 1,
    getProgress: (q) => (q?.bonusReward?.completed ? 1 : 0),
    isDone: (q) => q?.bonusReward?.completed ?? false,
  },
];

export function QuestsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAuth();
  const [dailyStatus, setDailyStatus] = useState<DailyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const status = await predictionsApi.getDailyStatus(tokens.accessToken);
      setDailyStatus(status);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error loading quests', text2: 'Pull down to try again' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const quests = dailyStatus?.quests;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.onSurface}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Daily Quests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Challenge Banner */}
        <View style={styles.bannerCard}>
          <LinearGradient
            colors={['rgba(202,253,0,0.12)', 'rgba(202,253,0,0)']}
            style={styles.bannerGlow}
          />
          <View style={styles.bannerTop}>
            <Ionicons name="trophy" size={20} color={colors.primary} />
            <Text style={styles.bannerTag}>CHALLENGE OF THE DAY</Text>
          </View>
          <Text style={styles.bannerBoost}>DOUBLE BOOST</Text>
          <Text style={styles.bannerTitle}>Multi-Sport{'\n'}Challenge</Text>
          <Text style={styles.bannerDesc}>
            Complete all daily quests to earn double points today.
          </Text>
        </View>

        {/* Daily Status */}
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
        ) : dailyStatus ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>TODAY'S PICKS</Text>
            <Text style={styles.statusValue}>
              {dailyStatus.used} / {dailyStatus.limit > 0 ? dailyStatus.limit : '∞'}
            </Text>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[colors.primaryContainer, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.progressFill,
                  { width: `${dailyStatus.limit > 0 ? Math.min((dailyStatus.used / dailyStatus.limit) * 100, 100) : 0}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* Quest Items */}
        <Text style={styles.sectionTitle}>DAILY QUESTS</Text>
        {DAILY_QUESTS.map((quest) => {
          const progress = quest.getProgress(quests);
          const done = quest.isDone(quests);

          return (
            <View key={quest.id} style={styles.questCard}>
              <View style={[styles.questIcon, done && styles.questIconDone]}>
                <Ionicons name={quest.icon} size={20} color={done ? '#4A5E00' : colors.primary} />
              </View>
              <View style={styles.questInfo}>
                <Text style={styles.questTitle}>{quest.title}</Text>
                <Text style={styles.questDesc}>{quest.description}</Text>
                {/* Progress bar */}
                <View style={styles.questProgressTrack}>
                  <LinearGradient
                    colors={done ? [colors.primary, colors.primary] : [colors.primaryContainer, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.questProgressFill,
                      { width: `${Math.min((progress / quest.target) * 100, 100)}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={[styles.questBadge, done && styles.questBadgeDone]}>
                {done ? (
                  <Ionicons name="checkmark" size={16} color="#4A5E00" />
                ) : (
                  <Text style={styles.questBadgeText}>
                    {progress}/{quest.target}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.comingSoon}>
          <Ionicons name="construct-outline" size={24} color={colors.onSurfaceVariant} />
          <Text style={styles.comingSoonText}>
            More quests and rewards are coming soon.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  bannerCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(243,255,202,0.1)',
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
  },
  bannerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  bannerTag: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  bannerBoost: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: colors.primaryContainer,
    marginBottom: 8,
  },
  bannerDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },

  statusCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  statusLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  statusValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 12 },

  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  questIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(202,253,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questIconDone: {
    backgroundColor: colors.primary,
  },
  questInfo: { flex: 1, gap: 2 },
  questTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  questDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  questProgressTrack: {
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  questProgressFill: { height: '100%', borderRadius: 4 },
  questBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questBadgeDone: {
    backgroundColor: colors.primary,
  },
  questBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },

  comingSoon: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  comingSoonText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
