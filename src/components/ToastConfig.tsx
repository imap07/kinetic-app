import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import type { BaseToastProps } from 'react-native-toast-message';

const ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: '#16A34A' },
  error: { name: 'alert-circle', color: '#DC2626' },
  info: { name: 'information-circle', color: colors.primary },
};

function ToastBase({ text1, text2, type }: BaseToastProps & { type?: string }) {
  const icon = ICONS[type ?? 'info'] ?? ICONS.info;
  return (
    <View style={styles.container}>
      <Ionicons name={icon.name} size={20} color={icon.color} />
      <View style={styles.textWrap}>
        {text1 ? <Text style={styles.title} numberOfLines={1}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message} numberOfLines={2}>{text2}</Text> : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <ToastBase {...props} type="success" />,
  error: (props: BaseToastProps) => <ToastBase {...props} type="error" />,
  info: (props: BaseToastProps) => <ToastBase {...props} type="info" />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(69,72,76,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  textWrap: { flex: 1, gap: 2 },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
});
