import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api';
import type { SportKey } from '../api/sports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETE_KEY } from './OnboardingScreen';

interface FavoriteTeam {
  apiId: number;
  sport: SportKey;
}

interface Props {
  sports: SportKey[];
  favoriteTeams: FavoriteTeam[];
  onComplete: () => void;
}

const SPORT_LABELS: Record<string, string> = {
  football: 'Soccer',
  basketball: 'Basketball',
  hockey: 'Hockey',
  'american-football': 'Football',
  baseball: 'Baseball',
  'formula-1': 'F1',
  afl: 'AFL',
  handball: 'Handball',
  rugby: 'Rugby',
  volleyball: 'Volleyball',
  mma: 'MMA',
};

export function OnboardingCompleteScreen({ sports, favoriteTeams, onComplete }: Props) {
  const { tokens, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const handleLetsGo = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setSaving(true);
    try {
      await authApi.completeOnboarding(tokens.accessToken, {
        sports,
        favoriteTeams: favoriteTeams.map((ft) => ({ apiId: ft.apiId, sport: ft.sport })),
      });
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      try { await refreshProfile(); } catch {}
      onComplete();
    } catch {
      // Still navigate — data was saved in previous steps
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      try { await refreshProfile(); } catch {}
      onComplete();
    } finally {
      setSaving(false);
    }
  }, [tokens?.accessToken, sports, favoriteTeams, onComplete, refreshProfile]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Checkmark */}
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={64} color="#5BEF90" />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {t('onboardingComplete.title', "You're all set!")}
        </Text>
        <Text style={styles.subtitle}>
          {t('onboardingComplete.subtitle', 'Your personalized feed is ready')}
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="football" size={20} color={colors.primary} />
            <Text style={styles.summaryText}>
              {sports.length} {sports.length === 1 ? 'sport' : 'sports'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Ionicons name="heart" size={20} color={colors.primary} />
            <Text style={styles.summaryText}>
              {favoriteTeams.length} {favoriteTeams.length === 1 ? 'team' : 'teams'} selected
            </Text>
          </View>
        </View>

        {/* Sport pills */}
        <View style={styles.sportPills}>
          {sports.map((sport) => (
            <View key={sport} style={styles.sportPill}>
              <Text style={styles.sportPillText}>{SPORT_LABELS[sport] || sport}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleLetsGo}
          disabled={saving}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={['#E8FF8A', '#CAFD00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#4A5E00" />
            ) : (
              <Text style={styles.ctaText}>
                {t('onboardingComplete.letsGo', "Let's Go")}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(91,239,144,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 8,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.outline,
  },
  sportPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  sportPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
  },
  sportPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 10,
  },
  ctaWrap: { borderRadius: 14, overflow: 'hidden' },
  ctaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: '#3A4A00',
    letterSpacing: 1.2,
  },
});
