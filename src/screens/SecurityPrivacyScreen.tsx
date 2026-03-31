import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { colors, spacing, borderRadius } from '../theme';
import { legalApi, authApi } from '../api';
import type { SessionInfo } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import {
  isBiometricAvailable,
  getBiometricLabel,
  enableBiometricLogin,
  disableBiometricLogin,
  isBiometricLoginEnabled,
} from '../services/biometricAuth';

type SettingToggle = {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: boolean;
};

function LegalModal({
  visible,
  type,
  onClose,
}: {
  visible: boolean;
  type: 'terms' | 'privacy';
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const fetcher = type === 'terms' ? legalApi.getTerms : legalApi.getPrivacy;
    fetcher()
      .then((doc) => {
        setTitle(doc.title);
        setContent(doc.content);
      })
      .catch(() => {
        setTitle(type === 'terms' ? 'Terms of Service' : 'Privacy Policy');
        setContent('Unable to load document. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, [visible, type]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={legalModalStyles.overlay}>
        <Pressable style={legalModalStyles.overlayBg} onPress={onClose} />
        <View
          style={[legalModalStyles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={legalModalStyles.handle} />
          <View style={legalModalStyles.header}>
            <Text style={legalModalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
          <ScrollView style={legalModalStyles.body} showsVerticalScrollIndicator>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 32 }} />
            ) : (
              <Text style={legalModalStyles.bodyText}>{content}</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={legalModalStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={legalModalStyles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function SecurityPrivacyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, tokens, updatePreferences } = useAuth();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric Login');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(true);

  // Check biometric hardware and current status on mount
  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const label = await getBiometricLabel();
        setBiometricLabel(label);
        const enabled = await isBiometricLoginEnabled();
        setBiometricEnabled(enabled);
      }
      setBiometricLoading(false);
    })();
  }, []);

  const handleBiometricToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        // Enable: requires biometric verification
        const email = user?.email ?? '';
        const refreshToken = await SecureStore.getItemAsync('kinetic_refresh_token');
        if (!email || !refreshToken) {
          Alert.alert('Error', 'Unable to enable biometric login. Please log in again.');
          return;
        }
        const success = await enableBiometricLogin(email, refreshToken);
        if (success) {
          setBiometricEnabled(true);
        }
        // If user cancels biometric prompt, nothing happens (stays off)
      } else {
        // Disable
        await disableBiometricLogin();
        setBiometricEnabled(false);
      }
    },
    [user?.email],
  );

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const accessToken = await SecureStore.getItemAsync('kinetic_access_token');
      const refreshToken = await SecureStore.getItemAsync('kinetic_refresh_token');
      if (!accessToken) return;
      const res = await authApi.getSessions(accessToken, refreshToken || undefined);
      setSessions(res.sessions);
    } catch {
      // silently fail
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = useCallback(async (sessionId: string) => {
    Alert.alert(
      'Revoke Session',
      'This will log out the device. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setRevokingId(sessionId);
              const accessToken = await SecureStore.getItemAsync('kinetic_access_token');
              if (!accessToken) return;
              await authApi.deleteSession(accessToken, sessionId);
              setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            } catch {
              Alert.alert('Error', 'Could not revoke session. Please try again.');
            } finally {
              setRevokingId(null);
            }
          },
        },
      ],
    );
  }, []);

  const formatLastActive = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [profilePublic, setProfilePublic] = useState(user?.publicProfile ?? true);
  const [showStats, setShowStats] = useState(user?.showStats ?? true);
  const [showHistory, setShowHistory] = useState(user?.showHistory ?? true);
  const [dataSharing, setDataSharing] = useState(user?.dataSharing ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfilePublic(user.publicProfile);
      setShowStats(user.showStats);
      setShowHistory(user.showHistory);
      setDataSharing(user.dataSharing);
    }
  }, [user]);

  const persistPreference = async (key: 'publicProfile' | 'showStats' | 'showHistory' | 'dataSharing', value: boolean) => {
    setSaving(true);
    try {
      await updatePreferences({ [key]: value });
    } catch {
      // Revert on failure
      if (key === 'publicProfile') setProfilePublic(!value);
      if (key === 'showStats') setShowStats(!value);
      if (key === 'showHistory') setShowHistory(!value);
      if (key === 'dataSharing') setDataSharing(!value);
    } finally {
      setSaving(false);
    }
  };

  const privacyToggles: SettingToggle[] = [
    {
      id: 'public',
      icon: <Feather name="eye" size={20} color={colors.info} />,
      label: 'Public Profile',
      sub: 'Allow other users to see your profile',
      value: profilePublic,
    },
    {
      id: 'stats',
      icon: <Feather name="bar-chart-2" size={20} color={colors.info} />,
      label: 'Show Stats',
      sub: 'Display your prediction stats on your profile',
      value: showStats,
    },
    {
      id: 'history',
      icon: <MaterialCommunityIcons name="history" size={20} color={colors.info} />,
      label: 'Show Prediction History',
      sub: 'Others can view your past predictions',
      value: showHistory,
    },
    {
      id: 'data',
      icon: <Feather name="database" size={20} color={colors.info} />,
      label: 'Data Sharing',
      sub: 'Share anonymized usage data to improve the app',
      value: dataSharing,
    },
  ];

  const toggleMap: Record<string, (v: boolean) => void> = {
    public: (v) => { setProfilePublic(v); persistPreference('publicProfile', v); },
    stats: (v) => { setShowStats(v); persistPreference('showStats', v); },
    history: (v) => { setShowHistory(v); persistPreference('showHistory', v); },
    data: (v) => { setDataSharing(v); persistPreference('dataSharing', v); },
  };

  function renderToggleRow(t: SettingToggle) {
    return (
      <View key={t.id} style={styles.toggleRow}>
        <View style={styles.toggleIcon}>{t.icon}</View>
        <View style={styles.toggleContent}>
          <Text style={styles.toggleLabel}>{t.label}</Text>
          <Text style={styles.toggleSub}>{t.sub}</Text>
        </View>
        <Switch
          value={t.value}
          onValueChange={(v) => toggleMap[t.id](v)}
          trackColor={{
            false: colors.surfaceContainerHighest,
            true: 'rgba(202,253,0,0.3)',
          }}
          thumbColor={t.value ? colors.primary : colors.onSurfaceDim}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SECURITY & PRIVACY</Text>
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Security section */}
        <Text style={styles.sectionLabel}>SECURITY</Text>

        {/* Biometric toggle — always visible */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIcon}>
              <MaterialCommunityIcons name="fingerprint" size={20} color={biometricAvailable ? colors.primary : colors.onSurfaceDim} />
            </View>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>
                {biometricLoading ? 'Biometric Login' : biometricLabel}
              </Text>
              <Text style={styles.toggleSub}>
                {biometricLoading
                  ? 'Checking availability...'
                  : biometricAvailable
                    ? `Use ${biometricLabel} to quickly log in`
                    : 'Not available on this device'}
              </Text>
            </View>
            {biometricLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{
                  false: colors.surfaceContainerHighest,
                  true: 'rgba(202,253,0,0.3)',
                }}
                thumbColor={
                  !biometricAvailable
                    ? colors.onSurfaceDim
                    : biometricEnabled
                      ? colors.primary
                      : colors.onSurfaceDim
                }
              />
            )}
          </View>
        </View>

        {/* Change Password */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <View style={styles.actionLeft}>
            <View style={styles.toggleIcon}>
              <Feather name="lock" size={20} color={colors.warning} />
            </View>
            <View>
              <Text style={styles.toggleLabel}>Change Password</Text>
              <Text style={styles.toggleSub}>Update your account password</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.onSurfaceDim} />
        </TouchableOpacity>

        {/* Active sessions */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => setSessionsExpanded((v) => !v)}
        >
          <View style={styles.actionLeft}>
            <View style={styles.toggleIcon}>
              <MaterialCommunityIcons name="devices" size={20} color={colors.onSurfaceVariant} />
            </View>
            <View>
              <Text style={styles.toggleLabel}>Active Sessions</Text>
              <Text style={styles.toggleSub}>
                {sessionsLoading
                  ? 'Loading...'
                  : `${sessions.length} device${sessions.length !== 1 ? 's' : ''} currently logged in`}
              </Text>
            </View>
          </View>
          <Feather
            name={sessionsExpanded ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={colors.onSurfaceDim}
          />
        </TouchableOpacity>

        {sessionsExpanded && (
          <View style={styles.sessionsCard}>
            {sessionsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: spacing.lg }} />
            ) : sessions.length === 0 ? (
              <Text style={[styles.toggleSub, { padding: spacing.lg }]}>No active sessions</Text>
            ) : (
              sessions.map((session) => (
                <View key={session.id} style={styles.sessionRow}>
                  <View style={styles.sessionIcon}>
                    <MaterialCommunityIcons
                      name={session.deviceOS.toLowerCase().includes('ios') ? 'apple' : session.deviceOS.toLowerCase().includes('android') ? 'android' : 'monitor'}
                      size={18}
                      color={session.isCurrent ? colors.primary : colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionNameRow}>
                      <Text style={styles.sessionName}>{session.deviceName}</Text>
                      {session.isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>THIS DEVICE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sessionDetail}>
                      {session.deviceOS} {'\u00B7'} {formatLastActive(session.lastActiveAt)}
                    </Text>
                  </View>
                  {!session.isCurrent && (
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => handleRevokeSession(session.id)}
                      disabled={revokingId === session.id}
                    >
                      {revokingId === session.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Text style={styles.revokeBtnText}>Revoke</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Privacy section */}
        <Text style={[styles.sectionLabel, { marginTop: spacing['3xl'] }]}>PRIVACY</Text>
        <View style={styles.card}>
          {privacyToggles.map(renderToggleRow)}
        </View>

        {/* Legal links */}
        <Text style={[styles.sectionLabel, { marginTop: spacing['3xl'] }]}>LEGAL</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.legalRow} onPress={() => setLegalModal('terms')}>
            <Feather name="file-text" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.legalText}>Terms of Service</Text>
            <Feather name="chevron-right" size={14} color={colors.onSurfaceDim} />
          </TouchableOpacity>
          <View style={styles.legalDivider} />
          <TouchableOpacity style={styles.legalRow} onPress={() => setLegalModal('privacy')}>
            <Feather name="shield" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.legalText}>Privacy Policy</Text>
            <Feather name="chevron-right" size={14} color={colors.onSurfaceDim} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LegalModal
        visible={legalModal === 'terms'}
        type="terms"
        onClose={() => setLegalModal(null)}
      />
      <LegalModal
        visible={legalModal === 'privacy'}
        type="privacy"
        onClose={() => setLegalModal(null)}
      />
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

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },

  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  toggleContent: { flex: 1, marginRight: spacing.sm },
  toggleLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  toggleSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  sessionsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sessionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurface,
  },
  currentBadge: {
    backgroundColor: 'rgba(202,253,0,0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  sessionDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
  revokeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  revokeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.error,
  },

  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: spacing.md,
  },
  legalText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurface,
  },
  legalDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.lg,
  },
});

const legalModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHighest,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  body: {
    flex: 1,
    marginBottom: 24,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  closeBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    letterSpacing: 1,
  },
});
