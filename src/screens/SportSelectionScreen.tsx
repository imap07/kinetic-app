import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api';
import type { SportKey } from '../api/sports';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_GAP = 12;
const CARD_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface SportOption {
  key: SportKey;
  name: string;
  icon: string;
  iconFamily: 'ionicons' | 'mci';
  color: string;
}

const SPORTS: SportOption[] = [
  { key: 'football', name: 'Soccer', iconFamily: 'ionicons', icon: 'football', color: '#5BEF90' },
  { key: 'basketball', name: 'Basketball', iconFamily: 'ionicons', icon: 'basketball', color: '#FF7351' },
  { key: 'hockey', name: 'Hockey', iconFamily: 'mci', icon: 'hockey-puck', color: '#4FC3F7' },
  { key: 'american-football', name: 'Football', iconFamily: 'ionicons', icon: 'american-football', color: '#A78BFA' },
  { key: 'baseball', name: 'Baseball', iconFamily: 'ionicons', icon: 'baseball', color: '#FBBF24' },
  { key: 'formula-1', name: 'F1', iconFamily: 'mci', icon: 'racing-helmet', color: '#FF4444' },
  { key: 'afl', name: 'AFL', iconFamily: 'ionicons', icon: 'american-football', color: '#00BCD4' },
  { key: 'handball', name: 'Handball', iconFamily: 'mci', icon: 'handball', color: '#FF9800' },
  { key: 'rugby', name: 'Rugby', iconFamily: 'mci', icon: 'rugby', color: '#8BC34A' },
  { key: 'volleyball', name: 'Volleyball', iconFamily: 'mci', icon: 'volleyball', color: '#E040FB' },
  { key: 'mma', name: 'MMA', iconFamily: 'mci', icon: 'karate', color: '#F44336' },
];

const MIN_SPORTS = 1;

interface Props {
  onComplete: (selectedSports: SportKey[]) => void;
}

export function SportSelectionScreen({ onComplete }: Props) {
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<SportKey>>(new Set(['football', 'basketball']));
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
        style={styles.scrollView}
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
                  <Ionicons name="checkmark" size={10} color="#0B0E11" />
                </View>
              )}

              {/* Icon */}
              <View style={[styles.iconWrap, { backgroundColor: sport.color + '18' }]}>
                {sport.iconFamily === 'mci' ? (
                  <MaterialCommunityIcons
                    name={sport.icon as any}
                    size={24}
                    color={sport.color}
                  />
                ) : (
                  <Ionicons name={sport.icon as any} size={24} color={sport.color} />
                )}
              </View>

              {/* Text */}
              <Text style={styles.sportName} numberOfLines={1}>{sport.name}</Text>
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

  // ScrollView
  scrollView: {
    flex: 1,
  },
  // Grid — 2 columns
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: CARD_PADDING,
    gap: CARD_GAP,
    paddingBottom: 16,
  },
  sportCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 10,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'center',
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
