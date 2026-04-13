import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * OfflineBanner — renders a small red banner at the very top of the screen
 * when the device has no internet connectivity. Auto-hides when the
 * connection is restored.
 *
 * Drop this component at the top-level of the app (e.g. inside App.tsx or
 * AppNavigator) so it renders above all screens.
 */
export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (isOnline) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.text}>{t('offline.noConnection')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
