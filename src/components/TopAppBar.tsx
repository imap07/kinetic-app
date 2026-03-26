import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';

interface TopAppBarProps {
  leftLabel?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

export function TopAppBar({ leftLabel, onBack, showBack, rightContent }: TopAppBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        )}
        {leftLabel && <Text style={styles.leftLabel}>{leftLabel}</Text>}
      </View>
      {rightContent || (
        <Text style={styles.brandText}>KINETIC</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  leftLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  brandText: {
    ...typography.titleMd,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
});
