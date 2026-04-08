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
import { notificationsApi } from '../api/notifications';

interface NotificationPreferences {
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

const DEFAULT_PREFS: NotificationPreferences = {
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

type PrefKey = keyof NotificationPreferences;

export function NotificationPreferencesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await notificationsApi.getPreferences(tokens.accessToken);
      if (res) setPrefs({ ...DEFAULT_PREFS, ...res });
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = useCallback(
    async (key: PrefKey, value: boolean) => {
      if (!tokens?.accessToken) return;
      const prev = prefs;
      setPrefs((p) => ({ ...p, [key]: value }));
      try {
        await notificationsApi.updatePreferences(tokens.accessToken, { [key]: value });
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
});
