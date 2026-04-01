import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api';
import type { SportKey } from '../api/sports';

interface Props {
  onComplete: (selectedSports: SportKey[]) => void;
}

interface SportOption {
  key: SportKey;
  name: string;
  icon: string;
  iconFamily: 'ionicons' | 'mci';
  color: string;
  description: string;
}

const SPORTS: SportOption[] = [
  {
    key: 'football',
    name: 'Soccer',
    iconFamily: 'ionicons',
    icon: 'football',
    color: '#5BEF90',
    description: 'Premier League, La Liga, Champions League & more',
  },
  {
    key: 'basketball',
    name: 'Basketball',
    iconFamily: 'ionicons',
    icon: 'basketball',
    color: '#FF7351',
    description: 'NBA, EuroLeague & international',
  },
  {
    key: 'hockey',
    name: 'Hockey',
    iconFamily: 'mci',
    icon: 'hockey-puck',
    color: '#4FC3F7',
    description: 'NHL, KHL & world championships',
  },
  {
    key: 'american-football',
    name: 'Football',
    iconFamily: 'ionicons',
    icon: 'american-football',
    color: '#A78BFA',
    description: 'NFL, college football & more',
  },
  {
    key: 'baseball',
    name: 'Baseball',
    iconFamily: 'ionicons',
    icon: 'baseball',
    color: '#FBBF24',
    description: 'MLB, NPB & world series',
  },
  {
    key: 'formula-1',
    name: 'Formula 1',
    iconFamily: 'mci',
    icon: 'racing-helmet',
    color: '#FF4444',
    description: 'Grand Prix, qualifying & race predictions',
  },
];

const MIN_SPORTS = 1;

export function SportSelectionScreen({ onComplete }: Props) {
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<SportKey>>(new Set(['football']));
  const [saving, setSaving] = useState(false);

  const toggleSport = useCallback((key: SportKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > MIN_SPORTS) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleContinue = useCallback(async () => {
    if (!tokens?.accessToken || selected.size < MIN_SPORTS) return;
    setSaving(true);
    try {
      await authApi.setFavoriteSports(tokens.accessToken, Array.from(selected));
      onComplete(Array.from(selected));
    } catch {
      // Silent — user can retry
    } finally {
      setSaving(false);
    }
  }, [tokens?.accessToken, selected, onComplete]);

  const canContinue = selected.size >= MIN_SPORTS;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepLabel}>{t('sportSelection.step')}</Text>
        <Text style={styles.title}>{t('sportSelection.title')}</Text>
        <Text style={styles.subtitle}>{t('sportSelection.subtitle')}</Text>
      </View>

      {/* Sport grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {SPORTS.map((sport) => {
          const isSel = selected.has(sport.key);
          return (
            <TouchableOpacity
              key={sport.key}
              style={[styles.sportCard, isSel && { borderColor: sport.color }]}
              onPress={() => toggleSport(sport.key)}
              activeOpacity={0.7}
            >
              {/* Selection indicator */}
              {isSel && (
                <View style={[styles.checkBadge, { backgroundColor: sport.color }]}>
                  <Ionicons name="checkmark" size={12} color="#0B0E11" />
                </View>
              )}

              {/* Icon */}
              <View style={[styles.iconWrap, { backgroundColor: sport.color + '18' }]}>
                {sport.iconFamily === 'mci' ? (
                  <MaterialCommunityIcons
                    name={sport.icon as any}
                    size={28}
                    color={sport.color}
                  />
                ) : (
                  <Ionicons name={sport.icon as any} size={28} color={sport.color} />
                )}
              </View>

              {/* Text */}
              <Text style={styles.sportName}>{sport.name}</Text>
              <Text style={styles.sportDesc} numberOfLines={2}>
                {sport.description}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaSummary}>
          <Text style={styles.ctaSummaryText}>
            {selected.size !== 1
              ? t('sportSelection.sportsSelectedPlural', { count: selected.size })
              : t('sportSelection.sportsSelected', { count: selected.size })}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={!canContinue || saving}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={canContinue ? ['#E8FF8A', '#CAFD00'] : ['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#4A5E00" />
            ) : (
              <>
                <Text style={[styles.ctaText, canContinue && styles.ctaTextActive]}>
                  {t('sportSelection.next')}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={canContinue ? '#4A5E00' : 'rgba(202,253,0,0.3)'}
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 4,
  },
  stepLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  sportCard: {
    width: '47.5%' as any,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 8,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
    marginTop: 2,
  },
  sportDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 10,
    backgroundColor: 'rgba(11,14,17,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  ctaSummary: {
    alignItems: 'center',
    marginBottom: 8,
  },
  ctaSummaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  ctaSummaryCount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
  },
  ctaWrap: { borderRadius: 14, overflow: 'hidden' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: 'rgba(202,253,0,0.3)',
    letterSpacing: 1.2,
  },
  ctaTextActive: { color: '#3A4A00' },
});
