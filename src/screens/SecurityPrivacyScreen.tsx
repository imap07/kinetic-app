import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

type SettingToggle = {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: boolean;
};

export function SecurityPrivacyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [biometric, setBiometric] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [dataSharing, setDataSharing] = useState(false);

  const securityToggles: SettingToggle[] = [
    {
      id: 'biometric',
      icon: <MaterialCommunityIcons name="fingerprint" size={20} color={colors.primary} />,
      label: 'Biometric Login',
      sub: 'Use Face ID or fingerprint to log in',
      value: biometric,
    },
    {
      id: '2fa',
      icon: <Feather name="shield" size={20} color={colors.primary} />,
      label: 'Two-Factor Authentication',
      sub: 'Add an extra layer of security via SMS or authenticator',
      value: twoFactor,
    },
  ];

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
    biometric: setBiometric,
    '2fa': setTwoFactor,
    public: setProfilePublic,
    stats: setShowStats,
    history: setShowHistory,
    data: setDataSharing,
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
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Security section */}
        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={styles.card}>
          {securityToggles.map(renderToggleRow)}
        </View>

        {/* Password */}
        <TouchableOpacity style={styles.actionRow}>
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
        <TouchableOpacity style={styles.actionRow}>
          <View style={styles.actionLeft}>
            <View style={styles.toggleIcon}>
              <MaterialCommunityIcons name="devices" size={20} color={colors.onSurfaceVariant} />
            </View>
            <View>
              <Text style={styles.toggleLabel}>Active Sessions</Text>
              <Text style={styles.toggleSub}>2 devices currently logged in</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.onSurfaceDim} />
        </TouchableOpacity>

        {/* Privacy section */}
        <Text style={[styles.sectionLabel, { marginTop: spacing['3xl'] }]}>PRIVACY</Text>
        <View style={styles.card}>
          {privacyToggles.map(renderToggleRow)}
        </View>

        {/* Legal links */}
        <Text style={[styles.sectionLabel, { marginTop: spacing['3xl'] }]}>LEGAL</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.legalRow}>
            <Feather name="file-text" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.legalText}>Terms of Service</Text>
            <Feather name="external-link" size={14} color={colors.onSurfaceDim} />
          </TouchableOpacity>
          <View style={styles.legalDivider} />
          <TouchableOpacity style={styles.legalRow}>
            <Feather name="shield" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.legalText}>Privacy Policy</Text>
            <Feather name="external-link" size={14} color={colors.onSurfaceDim} />
          </TouchableOpacity>
          <View style={styles.legalDivider} />
          <TouchableOpacity style={styles.legalRow}>
            <Feather name="download" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.legalText}>Download My Data</Text>
            <Feather name="chevron-right" size={14} color={colors.onSurfaceDim} />
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
