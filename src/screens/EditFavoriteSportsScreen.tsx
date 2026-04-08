import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api';
import type { SportKey } from '../api/sports';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

interface SportOption {
  key: SportKey;
  name: string;
  icon: string;
  iconFamily: 'ionicons' | 'mci';
  color: string;
  description: string;
  isFree: boolean;
}

const SPORTS: SportOption[] = [
  {
    key: 'football',
    name: 'Soccer',
    iconFamily: 'ionicons',
    icon: 'football',
    color: '#5BEF90',
    description: 'Premier League, La Liga, Champions League & more',
    isFree: true,
  },
  {
    key: 'basketball',
    name: 'Basketball',
    iconFamily: 'ionicons',
    icon: 'basketball',
    color: '#FF7351',
    description: 'NBA, EuroLeague & international',
    isFree: false,
  },
  {
    key: 'hockey',
    name: 'Hockey',
    iconFamily: 'mci',
    icon: 'hockey-puck',
    color: '#4FC3F7',
    description: 'NHL, KHL & world championships',
    isFree: false,
  },
  {
    key: 'american-football',
    name: 'Football',
    iconFamily: 'ionicons',
    icon: 'american-football',
    color: '#A78BFA',
    description: 'NFL, college football & more',
    isFree: false,
  },
  {
    key: 'baseball',
    name: 'Baseball',
    iconFamily: 'ionicons',
    icon: 'baseball',
    color: '#FBBF24',
    description: 'MLB, NPB & world series',
    isFree: false,
  },
  {
    key: 'formula-1',
    name: 'F1',
    iconFamily: 'mci',
    icon: 'racing-helmet',
    color: '#FF4444',
    description: 'Grand Prix, qualifying & race predictions',
    isFree: false,
  },
  {
    key: 'afl',
    name: 'AFL',
    iconFamily: 'ionicons',
    icon: 'american-football',
    color: '#00BCD4',
    description: 'Australian Football League',
    isFree: false,
  },
  {
    key: 'handball',
    name: 'Handball',
    iconFamily: 'mci',
    icon: 'handball',
    color: '#FF9800',
    description: 'Champions League, World Championship & more',
    isFree: false,
  },
  {
    key: 'rugby',
    name: 'Rugby',
    iconFamily: 'mci',
    icon: 'rugby',
    color: '#8BC34A',
    description: 'Six Nations, World Cup & international',
    isFree: false,
  },
  {
    key: 'volleyball',
    name: 'Volleyball',
    iconFamily: 'mci',
    icon: 'volleyball',
    color: '#E040FB',
    description: 'Nations League, Champions League & more',
    isFree: false,
  },
  {
    key: 'mma',
    name: 'MMA',
    iconFamily: 'mci',
    icon: 'karate',
    color: '#F44336',
    description: 'UFC events & fight predictions',
    isFree: false,
  },
];

const MIN_SPORTS = 1;

export function EditFavoriteSportsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, tokens, refreshProfile } = useAuth();
  const { t } = useTranslation();

  const [selected, setSelected] = useState<Set<SportKey>>(
    new Set((user?.favoriteSports ?? ['football']) as SportKey[]),
  );
  const [saving, setSaving] = useState(false);

  const toggleSport = useCallback(
    (key: SportKey) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          if (next.size > MIN_SPORTS) next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!tokens?.accessToken || selected.size < MIN_SPORTS) return;
    setSaving(true);
    try {
      await authApi.setFavoriteSports(tokens.accessToken, Array.from(selected));
      await refreshProfile();
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('editFavorites.errorSports'));
    } finally {
      setSaving(false);
    }
  }, [tokens?.accessToken, selected, navigation, refreshProfile]);

  // Check if something changed
  const currentSports = new Set((user?.favoriteSports ?? []) as string[]);
  const hasChanges =
    selected.size !== currentSports.size ||
    Array.from(selected).some((s) => !currentSports.has(s));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editFavorites.sportsTitle')}</Text>
        <TouchableOpacity hitSlop={12} onPress={handleSave} disabled={saving || !hasChanges}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtn, !hasChanges && { opacity: 0.3 }]}>{t('editFavorites.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.descSection}>
        <Text style={styles.descText}>
          {t('editFavorites.sportsDesc')}
        </Text>
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
              style={[
                styles.sportCard,
                isSel && { borderColor: sport.color },
              ]}
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
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Summary footer */}
      {hasChanges && (
        <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
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
                  {selected.size !== 1
                    ? t('editFavorites.saveSports', { count: selected.size })
                    : t('editFavorites.saveSport', { count: selected.size })}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  saveBtn: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // Description
  descSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  descText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
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
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: '#FFD700',
    letterSpacing: 0.5,
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

  // Footer CTA
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: 'rgba(11,14,17,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
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
    color: '#3A4A00',
    letterSpacing: 1.2,
  },
});
