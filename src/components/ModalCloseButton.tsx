import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface ModalCloseButtonProps {
  onClose: () => void;
  /** 'fullscreen' uses safe-area insets for top; 'sheet' uses fixed position in header */
  variant?: 'fullscreen' | 'sheet';
}

/**
 * Unified close button for all modals.
 *
 * - `fullscreen`: Absolute top-right, respects safe area. Use in fullScreenModal screens.
 * - `sheet`: No absolute positioning — place it inside a flexbox header row.
 */
export function ModalCloseButton({ onClose, variant = 'fullscreen' }: ModalCloseButtonProps) {
  const insets = useSafeAreaInsets();

  if (variant === 'sheet') {
    return (
      <TouchableOpacity
        onPress={onClose}
        hitSlop={12}
        style={styles.sheetBtn}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onClose}
      style={[styles.fullscreenBtn, { top: insets.top + 12 }]}
      accessibilityLabel="Close"
      accessibilityRole="button"
    >
      <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fullscreenBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
