/**
 * Guided first-pick overlay.
 *
 * Full-screen scrim + spotlight shown the first time a post-onboarding
 * user lands on the Dashboard. Points at the "next up" hero card
 * with a tooltip "Make your first prediction — it's free", and
 * dismisses on tap (either on the highlighted card or anywhere
 * else, to avoid trapping users who want to explore).
 *
 * Activation criteria
 * -------------------
 * Controlled by AsyncStorage flag `kinetic.guidedFirstPick.seen`. The
 * caller mounts this once after onboarding completion; subsequent
 * dashboard loads skip it. Also gated by the `guided_first_pick`
 * server flag so we can disable in production without a redeploy.
 *
 * Why a modal overlay and not a tooltip library
 * ---------------------------------------------
 * Tooltip libs for RN (walkthrough, copilot, spotlight) all require
 * registering refs across the tree and have fragile interactions
 * with Animated + FlatList. A plain Modal with a dimmed backdrop
 * and a pointer arrow is 50 lines, has zero deps, and animates
 * cleanly via opacity fade-in.
 */
import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function GuidedFirstPickOverlay({ visible, onDismiss }: Props) {
  const { t } = useTranslation();
  const fade = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      // Gentle up-down arrow bounce, 2 loops then stays.
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, { toValue: 6, duration: 600, useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        { iterations: 6 },
      ).start();
    } else {
      fade.setValue(0);
    }
  }, [visible, fade, bounce]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />

        {/* Tooltip — positioned roughly above where the Next-up hero
            sits on the Dashboard. The exact offset depends on screen
            size; we use a generous vertical margin so the arrow
            points at the top of the hero card on most devices. */}
        <View style={styles.tooltipWrap}>
          <Animated.View style={{ transform: [{ translateY: bounce }] }}>
            <Feather name="arrow-down" size={36} color={colors.primary} />
          </Animated.View>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipTitle}>
              {t('onboarding.firstPickTitle', 'Make your first prediction')}
            </Text>
            <Text style={styles.tooltipBody}>
              {t(
                'onboarding.firstPickBody',
                "It's free. One tap and you're in the game.",
              )}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="Dismiss tutorial"
          >
            <Text style={styles.dismissText}>
              {t('onboarding.skipTutorial', 'Got it')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
    // Push the tooltip down so the arrow points at the top of the
    // Dashboard ScrollView (where the NextUpHero lives).
    paddingTop: 140,
  },
  tooltipWrap: {
    alignItems: 'center',
    gap: 14,
  },
  tooltip: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.3)',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    maxWidth: 320,
  },
  tooltipTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    textAlign: 'center',
  },
  tooltipBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },
  dismissBtn: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  dismissText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: '#0B0E11',
    letterSpacing: 0.5,
  },
});
