import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi, NotificationTypes } from '../api/notifications';

const SPORT_LABELS: Record<string, string> = {
  football: 'Football',
  basketball: 'Basketball',
  hockey: 'Hockey',
  'american-football': 'Am. Football',
  baseball: 'Baseball',
  'formula-1': 'Formula 1',
  afl: 'AFL',
  handball: 'Handball',
  rugby: 'Rugby',
  volleyball: 'Volleyball',
  mma: 'MMA',
};

const SPORT_ICONS: Record<string, string> = {
  football: '⚽',
  basketball: '🏀',
  hockey: '🏒',
  'american-football': '🏈',
  baseball: '⚾',
  'formula-1': '🏎️',
  afl: '🏉',
  handball: '🤾',
  rugby: '🏉',
  volleyball: '🏐',
  mma: '🥊',
};

/**
 * Local UI state is kept FLAT for simplicity, but the backend stores
 * `types` as a nested sub-object and the master toggle under the key
 * `enabled` (not `pushEnabled`). The load/save paths below translate
 * between the two shapes — do NOT send this shape directly to the API.
 */
interface LocalPrefs {
  pushEnabled: boolean;
  gameStart: boolean;
  liveScores: boolean;
  gameEnd: boolean;
  predictionResults: boolean;
  coinLeagues: boolean;
  dailyReminders: boolean;
  achievements: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_PREFS: LocalPrefs = {
  pushEnabled: true,
  gameStart: true,
  liveScores: true,
  gameEnd: true,
  predictionResults: true,
  coinLeagues: true,
  dailyReminders: true,
  achievements: true,
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
};

type PrefKey = keyof LocalPrefs;

// Keys that map 1:1 into the backend `types` sub-object.
const TYPE_KEYS: ReadonlyArray<keyof NotificationTypes> = [
  'gameStart',
  'liveScores',
  'gameEnd',
  'predictionResults',
  'coinLeagues',
  'dailyReminders',
  'achievements',
];

export function NotificationPreferencesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { tokens, user } = useAuth();
  const [prefs, setPrefs] = useState<LocalPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  /**
   * Load preferences from the backend and flatten them into the UI state.
   * Backend shape: { preferences: { enabled, types: {...}, quietHours... } }
   * UI shape:      { pushEnabled, gameStart, ..., quietHours... } (flat)
   */
  const fetchPreferences = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await notificationsApi.getPreferences(tokens.accessToken);
      const remote = res?.preferences;
      if (remote) {
        setPrefs({
          pushEnabled: remote.enabled ?? true,
          gameStart: remote.types?.gameStart ?? true,
          liveScores: remote.types?.liveScores ?? true,
          gameEnd: remote.types?.gameEnd ?? true,
          predictionResults: remote.types?.predictionResults ?? true,
          coinLeagues: remote.types?.coinLeagues ?? true,
          dailyReminders: remote.types?.dailyReminders ?? true,
          achievements: remote.types?.achievements ?? true,
          quietHoursEnabled: remote.quietHoursEnabled ?? false,
          quietHoursStart: remote.quietHoursStart ?? '23:00',
          quietHoursEnd: remote.quietHoursEnd ?? '07:00',
        });
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  /**
   * Flip a single toggle and send the patch in the shape the backend expects.
   * The screen keeps a flat local state for convenience, so we translate
   * back to nested (`{ types: {...} }`) or to the correct top-level field
   * name (`enabled` instead of `pushEnabled`) on each write.
   */
  const handleToggle = useCallback(
    async (key: PrefKey, value: boolean) => {
      if (!tokens?.accessToken) return;
      const prev = prefs;
      setPrefs((p) => ({ ...p, [key]: value }));

      // Build the backend-shaped patch for this one toggle.
      let patch: Parameters<typeof notificationsApi.updatePreferences>[1];
      if (key === 'pushEnabled') {
        patch = { enabled: value };
      } else if ((TYPE_KEYS as readonly string[]).includes(key)) {
        patch = { types: { [key]: value } as Partial<NotificationTypes> };
      } else if (key === 'quietHoursEnabled') {
        patch = { quietHoursEnabled: value };
      } else if (key === 'quietHoursStart') {
        patch = { quietHoursStart: value as unknown as string };
      } else if (key === 'quietHoursEnd') {
        patch = { quietHoursEnd: value as unknown as string };
      } else {
        // Shouldn't happen, but bail safely rather than sending garbage.
        return;
      }

      try {
        await notificationsApi.updatePreferences(tokens.accessToken, patch);
      } catch {
        setPrefs(prev);
        Alert.alert(t('notificationPrefs.errorTitle'), t('notificationPrefs.errorMessage'));
      }
    },
    [tokens?.accessToken, prefs, t],
  );

  const renderSwitch = (value: boolean, onToggle: (v: boolean) => void, disabled = false) => (
    <Switch
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
      trackColor={{ false: colors.surfaceContainerHighest, true: 'rgba(202,253,0,0.3)' }}
      thumbColor={value ? colors.primary : colors.onSurfaceDim}
    />
  );

  const renderRow = (
    label: string,
    subtitle: string,
    key: PrefKey,
    disabled = false,
  ) => (
    <View style={[styles.row, disabled && styles.rowDisabled]} key={key}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
        <Text style={[styles.rowSub, disabled && styles.rowSubDisabled]}>{subtitle}</Text>
      </View>
      {renderSwitch(prefs[key] as boolean, (v) => handleToggle(key, v), disabled)}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notificationPrefs.title')}</Text>
          <View style={{ width: 22 }} />
        </View>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 32 }} />
      </View>
    );
  }

  const typesDisabled = !prefs.pushEnabled;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notificationPrefs.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Toggle */}
        <View style={styles.masterToggle}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{t('notificationPrefs.pushNotifications')}</Text>
            <Text style={styles.rowSub}>{t('notificationPrefs.pushDesc')}</Text>
          </View>
          {renderSwitch(prefs.pushEnabled, (v) => handleToggle('pushEnabled', v))}
        </View>

        {/* Notification Types */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('notificationPrefs.notificationTypes')}</Text>
        </View>

        <View style={styles.card}>
          {renderRow(
            t('notificationPrefs.gameStart'),
            t('notificationPrefs.gameStartDesc'),
            'gameStart',
            typesDisabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            t('notificationPrefs.liveScores'),
            t('notificationPrefs.liveScoresDesc'),
            'liveScores',
            typesDisabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            t('notificationPrefs.gameEnd'),
            t('notificationPrefs.gameEndDesc'),
            'gameEnd',
            typesDisabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            t('notificationPrefs.predictionResults'),
            t('notificationPrefs.predictionResultsDesc'),
            'predictionResults',
            typesDisabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            t('notificationPrefs.coinLeagues'),
            t('notificationPrefs.coinLeaguesDesc'),
            'coinLeagues',
            typesDisabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            t('notificationPrefs.dailyReminders'),
            t('notificationPrefs.dailyRemindersDesc'),
            'dailyReminders',
            typesDisabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            t('notificationPrefs.achievements'),
            t('notificationPrefs.achievementsDesc'),
            'achievements',
            typesDisabled,
          )}
        </View>

        {/* By Sport */}
        {user?.favoriteSports && user.favoriteSports.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{t('notificationPrefs.bySportSection')}</Text>
            </View>
            <Text style={styles.sectionDesc}>{t('notificationPrefs.bySportDesc')}</Text>
            <View style={styles.card}>
              {user.favoriteSports.map((sport, idx) => {
                const sportName = SPORT_LABELS[sport] ?? sport;
                const icon = SPORT_ICONS[sport] ?? '🏅';
                return (
                  <React.Fragment key={sport}>
                    {idx > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.row}
                      activeOpacity={0.7}
                      disabled={typesDisabled}
                      onPress={() =>
                        navigation.navigate('SportNotificationPreferences', {
                          sport,
                          sportName,
                        })
                      }
                    >
                      <Text style={styles.sportIcon}>{icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowLabel, typesDisabled && styles.rowLabelDisabled]}>
                          {sportName}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.onSurfaceDim} />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        {/* Quiet Hours */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('notificationPrefs.quietHours')}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, typesDisabled && styles.rowLabelDisabled]}>
                {t('notificationPrefs.quietHoursEnable')}
              </Text>
            </View>
            {renderSwitch(
              prefs.quietHoursEnabled,
              (v) => handleToggle('quietHoursEnabled', v),
              typesDisabled,
            )}
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            disabled={!prefs.quietHoursEnabled || typesDisabled}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.rowLabel,
                { flex: 1 },
                (!prefs.quietHoursEnabled || typesDisabled) && styles.rowLabelDisabled,
              ]}
            >
              {t('notificationPrefs.startTime')}
            </Text>
            <Text
              style={[
                styles.timeValue,
                (!prefs.quietHoursEnabled || typesDisabled) && styles.timeValueDisabled,
              ]}
            >
              {prefs.quietHoursStart}
            </Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            disabled={!prefs.quietHoursEnabled || typesDisabled}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.rowLabel,
                { flex: 1 },
                (!prefs.quietHoursEnabled || typesDisabled) && styles.rowLabelDisabled,
              ]}
            >
              {t('notificationPrefs.endTime')}
            </Text>
            <Text
              style={[
                styles.timeValue,
                (!prefs.quietHoursEnabled || typesDisabled) && styles.timeValueDisabled,
              ]}
            >
              {prefs.quietHoursEnd}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  scroll: { flex: 1 },

  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
  },

  card: {
    marginHorizontal: spacing.lg,
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
  rowDisabled: {
    opacity: 0.5,
  },
  rowLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  rowLabelDisabled: {
    color: colors.onSurfaceDim,
  },
  rowSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
  rowSubDisabled: {
    color: colors.onSurfaceDim,
  },

  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing['2xl'],
  },

  timeValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  timeValueDisabled: {
    color: colors.onSurfaceDim,
  },
  sectionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
  },
  sportIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
});
