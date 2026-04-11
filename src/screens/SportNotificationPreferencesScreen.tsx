import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi, NotificationTypes } from '../api/notifications';

type SportPrefsRouteParams = { sport: string; sportName: string };

type ToggleKey = 'gameStart' | 'liveScores' | 'gameEnd';

interface LocalOverride {
  gameStart: boolean;
  liveScores: boolean;
  gameEnd: boolean;
}

const DEFAULT_OVERRIDE: LocalOverride = {
  gameStart: true,
  liveScores: true,
  gameEnd: true,
};

export function SportNotificationPreferencesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { sport, sportName } = route.params as SportPrefsRouteParams;
  const { tokens } = useAuth();

  const [override, setOverride] = useState<LocalOverride>(DEFAULT_OVERRIDE);
  const [isCustomized, setIsCustomized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await notificationsApi.getSportOverride(tokens.accessToken, sport);
      if (res?.override) {
        setOverride({
          gameStart: res.override.gameStart ?? true,
          liveScores: res.override.liveScores ?? true,
          gameEnd: res.override.gameEnd ?? true,
        });
        setIsCustomized(true);
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken, sport]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = useCallback(
    async (key: ToggleKey, value: boolean) => {
      if (!tokens?.accessToken || saving) return;
      const prev = override;
      const next = { ...override, [key]: value };
      setOverride(next);
      setIsCustomized(true);
      setSaving(true);
      try {
        await notificationsApi.updateSportOverride(tokens.accessToken, sport, {
          [key]: value,
        } as Partial<NotificationTypes>);
      } catch {
        setOverride(prev);
        Alert.alert(
          t('notificationPrefs.errorTitle'),
          t('notificationPrefs.errorMessage'),
        );
      } finally {
        setSaving(false);
      }
    },
    [tokens?.accessToken, sport, override, saving, t],
  );

  const handleReset = useCallback(() => {
    Alert.alert(
      t('notificationPrefs.sportPrefsReset'),
      t('notificationPrefs.sportPrefsResetConfirm', { sportName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notificationPrefs.sportPrefsReset'),
          style: 'destructive',
          onPress: async () => {
            if (!tokens?.accessToken) return;
            setSaving(true);
            try {
              await notificationsApi.removeSportOverride(tokens.accessToken, sport);
              setOverride(DEFAULT_OVERRIDE);
              setIsCustomized(false);
            } catch {
              Alert.alert(
                t('notificationPrefs.errorTitle'),
                t('notificationPrefs.errorMessage'),
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }, [tokens?.accessToken, sport, sportName, t]);

  const renderRow = (label: string, subtitle: string, key: ToggleKey) => (
    <View style={styles.row} key={key}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={override[key]}
        onValueChange={(v) => handleToggle(key, v)}
        disabled={saving}
        trackColor={{ false: colors.surfaceContainerHighest, true: 'rgba(202,253,0,0.3)' }}
        thumbColor={override[key] ? colors.primary : colors.onSurfaceDim}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('notificationPrefs.sportPrefsTitle', { sportName: sportName.toUpperCase() })}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={styles.infoBannerText}>
              {t('notificationPrefs.sportPrefsSubtitle', { sportName })}
            </Text>
          </View>

          {/* Toggles */}
          <View style={styles.card}>
            {renderRow(
              t('notificationPrefs.gameStart'),
              t('notificationPrefs.gameStartDesc'),
              'gameStart',
            )}
            <View style={styles.divider} />
            {renderRow(
              t('notificationPrefs.liveScores'),
              t('notificationPrefs.liveScoresDesc'),
              'liveScores',
            )}
            <View style={styles.divider} />
            {renderRow(
              t('notificationPrefs.gameEnd'),
              t('notificationPrefs.gameEndDesc'),
              'gameEnd',
            )}
          </View>

          {/* Reset button — only shown when there's an active override */}
          {isCustomized && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Feather name="rotate-ccw" size={14} color={colors.error ?? '#FF5252'} />
              <Text style={styles.resetText}>{t('notificationPrefs.sportPrefsReset')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.onSurface,
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(198,255,0,0.06)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(198,255,0,0.15)',
  },
  infoBannerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    lineHeight: 18,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  },
  rowLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  rowSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing['2xl'],
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing['2xl'],
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resetText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.error ?? '#FF5252',
  },
});
