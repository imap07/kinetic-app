import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

export type NotificationScope = 'my_teams' | 'all_games';

export interface NotificationSetupResult {
  permissionGranted: boolean;
  scope: NotificationScope;
  gameStart: boolean;
  liveScores: boolean;
  gameEnd: boolean;
  predictionResults: boolean;
}

interface Props {
  onComplete: (result: NotificationSetupResult) => void;
  onBack?: () => void;
  // `my_teams` mode is only meaningful when the user actually picked
  // teams or leagues earlier. If they skipped both, the option would
  // silently yield zero notifications, so we dim it, flip the default
  // scope to `all_games`, and move the "Recommended" badge.
  hasFavorites?: boolean;
}

interface NotifToggle {
  key: string;
  labelKey: string;
  subtitleKey: string;
  icon: string;
  iconFamily: 'ion' | 'mci';
  defaultValue: boolean;
}

const TOGGLES: NotifToggle[] = [
  {
    key: 'gameStart',
    labelKey: 'notificationSetup.gameKickoff',
    subtitleKey: 'notificationSetup.gameKickoffDesc',
    icon: 'play-circle',
    iconFamily: 'ion',
    defaultValue: true,
  },
  {
    key: 'liveScores',
    labelKey: 'notificationSetup.liveScores',
    subtitleKey: 'notificationSetup.liveScoresDesc',
    icon: 'flash',
    iconFamily: 'ion',
    defaultValue: false,
  },
  {
    key: 'gameEnd',
    labelKey: 'notificationSetup.finalResults',
    subtitleKey: 'notificationSetup.finalResultsDesc',
    icon: 'flag',
    iconFamily: 'ion',
    defaultValue: true,
  },
  {
    key: 'predictionResults',
    labelKey: 'notificationSetup.predictionResults',
    subtitleKey: 'notificationSetup.predictionResultsDesc',
    icon: 'trophy',
    iconFamily: 'ion',
    defaultValue: true,
  },
];

export function NotificationSetupScreen({ onComplete, onBack, hasFavorites = true }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [scope, setScope] = useState<NotificationScope>(hasFavorites ? 'my_teams' : 'all_games');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    gameStart: true,
    liveScores: false,
    gameEnd: true,
    predictionResults: true,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionGranted(status === 'granted');
      setPermissionChecked(true);
    })();
  }, []);

  const requestPermission = useCallback(async () => {
    setRequesting(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
      } else {
        Alert.alert(
          t('notificationSetup.alertTitle'),
          t('notificationSetup.alertMessage'),
          [
            { text: t('notificationSetup.alertCancel'), style: 'cancel' },
            { text: t('notificationSetup.alertOpenSettings'), onPress: () => Linking.openSettings() },
          ],
        );
      }
    } finally {
      setRequesting(false);
    }
  }, []);

  const toggleValue = useCallback((key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleContinue = useCallback(() => {
    onComplete({
      permissionGranted,
      scope,
      gameStart: toggles.gameStart,
      liveScores: toggles.liveScores,
      gameEnd: toggles.gameEnd,
      predictionResults: toggles.predictionResults,
    });
  }, [permissionGranted, scope, toggles, onComplete]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          )}
          <Text style={styles.stepLabel}>{t('notificationSetup.step')}</Text>
        </View>
        <Text style={styles.title}>{t('notificationSetup.title')}</Text>
        <Text style={styles.subtitle}>
          {t('notificationSetup.subtitle')}
        </Text>
        <Text style={[styles.subtitle, { marginTop: 8, fontSize: 12 }]}>
          {t('notificationSetup.scopeHint')}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission card */}
        {permissionChecked && !permissionGranted && (
          <TouchableOpacity
            style={styles.permissionCard}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <View style={styles.permissionIcon}>
              <Ionicons name="notifications" size={28} color={colors.primary} />
            </View>
            <View style={styles.permissionText}>
              <Text style={styles.permissionTitle}>{t('notificationSetup.enableNotifications')}</Text>
              <Text style={styles.permissionSubtitle}>
                {t('notificationSetup.enableSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        {permissionChecked && permissionGranted && (
          <View style={[styles.permissionCard, styles.permissionGranted]}>
            <View style={[styles.permissionIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            </View>
            <View style={styles.permissionText}>
              <Text style={styles.permissionTitle}>{t('notificationSetup.notificationsEnabled')}</Text>
              <Text style={styles.permissionSubtitle}>
                {t('notificationSetup.enabledSubtitle')}
              </Text>
            </View>
          </View>
        )}

        {/* Scope selection + Toggle types — dimmed when permission denied */}
        <View style={{ opacity: (!permissionChecked || permissionGranted) ? 1 : 0.5 }}>
          {/* Scope selection */}
          <Text style={styles.sectionTitle}>{t('notificationSetup.notifyAbout')}</Text>

          <TouchableOpacity
            style={[
              styles.scopeCard,
              scope === 'my_teams' && styles.scopeCardActive,
              !hasFavorites && styles.scopeCardDisabled,
            ]}
            onPress={() => {
              if (!hasFavorites) {
                Alert.alert(
                  t('notificationSetup.noFavoritesAlertTitle', 'No favorites selected'),
                  t(
                    'notificationSetup.noFavoritesAlertMessage',
                    "You didn't pick any teams or leagues, so \"My Teams\" wouldn't send you anything. Go back to pick some, or choose \"All Games\" to get updates for every game in your favorite sports.",
                  ),
                  [
                    {
                      text: t('notificationSetup.noFavoritesAlertStay', 'Use All Games'),
                      onPress: () => setScope('all_games'),
                    },
                    ...(onBack
                      ? [
                          {
                            text: t('notificationSetup.noFavoritesAlertBack', 'Go back'),
                            onPress: onBack,
                          },
                        ]
                      : []),
                  ],
                );
                return;
              }
              setScope('my_teams');
            }}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ checked: scope === 'my_teams', disabled: !hasFavorites }}
          >
            <View style={[styles.scopeRadio, !hasFavorites && styles.scopeRadioDisabled]}>
              {scope === 'my_teams' && <View style={styles.scopeRadioDot} />}
            </View>
            <View style={styles.scopeTextWrap}>
              <Text style={[styles.scopeLabel, !hasFavorites && styles.scopeLabelDisabled]}>
                {t('notificationSetup.myTeams')}
              </Text>
              <Text style={styles.scopeDesc}>
                {hasFavorites
                  ? t('notificationSetup.myTeamsDesc')
                  : t(
                      'notificationSetup.myTeamsNoneSelected',
                      'No teams or leagues picked — tap to go back, or use All Games.',
                    )}
              </Text>
            </View>
            {hasFavorites && (
              <View style={[styles.scopeBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.scopeBadgeText, { color: colors.primary }]}>
                  {t('notificationSetup.recommended')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeCard, scope === 'all_games' && styles.scopeCardActive]}
            onPress={() => setScope('all_games')}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ checked: scope === 'all_games' }}
          >
            <View style={styles.scopeRadio}>
              {scope === 'all_games' && <View style={styles.scopeRadioDot} />}
            </View>
            <View style={styles.scopeTextWrap}>
              <Text style={styles.scopeLabel}>{t('notificationSetup.allGames')}</Text>
              <Text style={styles.scopeDesc}>
                {t('notificationSetup.allGamesDesc')}
              </Text>
            </View>
            {!hasFavorites && (
              <View style={[styles.scopeBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.scopeBadgeText, { color: colors.primary }]}>
                  {t('notificationSetup.recommended')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Toggle types */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('notificationSetup.notificationTypes')}</Text>

          {TOGGLES.map((toggle) => (
            <View key={toggle.key} style={styles.toggleRow}>
              <View style={styles.toggleIconWrap}>
                {toggle.iconFamily === 'ion' ? (
                  <Ionicons name={toggle.icon as any} size={20} color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons name={toggle.icon as any} size={20} color={colors.primary} />
                )}
              </View>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleLabel}>{t(toggle.labelKey)}</Text>
                <Text style={styles.toggleSubtitle}>{t(toggle.subtitleKey)}</Text>
              </View>
              <Switch
                value={toggles[toggle.key]}
                onValueChange={() => toggleValue(toggle.key)}
                trackColor={{ false: '#2A2E34', true: colors.primary + '60' }}
                thumbColor={toggles[toggle.key] ? colors.primary : '#6B6E73'}
                ios_backgroundColor="#2A2E34"
                accessibilityLabel={t(toggle.labelKey)}
              />
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={requesting}
          style={[styles.ctaWrap, requesting && { opacity: 0.5 }]}
        >
          <LinearGradient
            colors={['#E8FF8A', '#CAFD00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>{t('notificationSetup.continue')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#4A5E00" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  stepLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  // Permission card
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    marginBottom: 20,
    gap: 14,
  },
  permissionGranted: {
    borderColor: colors.primary + '20',
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: { flex: 1 },
  permissionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
  },
  permissionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 10,
    letterSpacing: -0.2,
  },

  // Scope cards
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 10,
    gap: 12,
  },
  scopeCardActive: {
    borderColor: colors.primary,
  },
  scopeCardDisabled: {
    opacity: 0.55,
  },
  scopeLabelDisabled: {
    color: colors.onSurfaceVariant,
  },
  scopeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeRadioDisabled: {
    borderColor: colors.onSurfaceVariant,
  },
  scopeRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  scopeTextWrap: { flex: 1 },
  scopeLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
  },
  scopeDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  scopeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scopeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline + '30',
  },
  toggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextWrap: { flex: 1 },
  toggleLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  toggleSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
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
