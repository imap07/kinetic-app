import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../theme';
import { PICK_REACTIONS, PICK_REACTION_GLYPHS, type PickReactionKey } from '../shared/domain';
import type { ReactionSummary } from '../api/reactions';

interface Props {
  summary: ReactionSummary;
  onToggle: (emoji: PickReactionKey) => Promise<void> | void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * 4-emoji reaction bar rendered under each pick in the league feed.
 * Optimistic toggle with haptic feedback. The parent owns the summary
 * state so multiple instances (list + sheet) can stay in sync via
 * shared store updates.
 */
export function ReactionBar({ summary, onToggle, disabled, compact }: Props) {
  const [pending, setPending] = useState<PickReactionKey | null>(null);

  const handlePress = useCallback(
    async (emoji: PickReactionKey) => {
      if (disabled || pending) return;
      setPending(emoji);
      Haptics.selectionAsync().catch(() => {});
      try {
        await onToggle(emoji);
      } finally {
        setPending(null);
      }
    },
    [disabled, pending, onToggle],
  );

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {PICK_REACTIONS.map((emoji) => {
        const active = summary.myReactions.includes(emoji);
        const count = summary.counts[emoji] ?? 0;
        const isPending = pending === emoji;
        return (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.chip,
              active && styles.chipActive,
              compact && styles.chipCompact,
            ]}
            onPress={() => handlePress(emoji)}
            accessibilityRole="button"
            accessibilityLabel={`${emoji} reaction, ${count} ${count === 1 ? 'person' : 'people'}`}
            accessibilityState={{ selected: active, disabled: !!disabled }}
            activeOpacity={0.7}
            disabled={disabled}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Text style={styles.glyph}>{PICK_REACTION_GLYPHS[emoji]}</Text>
            {isPending ? (
              <ActivityIndicator size="small" color={colors.onSurface} />
            ) : (
              count > 0 && (
                <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
              )
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  rowCompact: {
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 32,
  },
  chipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 28,
  },
  chipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  glyph: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  countActive: {
    color: colors.primary,
  },
});
