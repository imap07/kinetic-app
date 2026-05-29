import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme';
import { MIN_AGE_YEARS } from '../shared/domain';
import { track } from '../services/analytics';

// Latest birthdate that satisfies 18+. Picker can't go past this.
const MAX_BIRTHDATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
  return d;
})();

const MIN_BIRTHDATE = new Date(1920, 0, 1);

/**
 * Soft DOB prompt for accounts that bypassed the registration gate
 * (social login, grandfathered pre-v1.6). Server returns
 * `needsBirthdatePrompt: true` from /auth/me when it's been ≥3 days
 * since the last dismissal. The user can either confirm their DOB
 * (server enforces 18+) or tap Later to snooze for 3 more days.
 *
 * Mounted at the root of the authenticated tree so it shows over
 * any screen. Never blocks gameplay — only gift card redemption is
 * actually gated server-side (see giftcards.service.ts).
 */
export function BirthdateReminderModal() {
  const { t } = useTranslation();
  const { needsBirthdatePrompt, setBirthdate, dismissBirthdatePrompt } =
    useAuth();

  const [picked, setPicked] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (needsBirthdatePrompt && !shownRef.current) {
      shownRef.current = true;
      track({ event: 'birthdate_prompt_shown' });
    }
    if (!needsBirthdatePrompt) {
      shownRef.current = false;
      setPicked(null);
      setError(null);
    }
  }, [needsBirthdatePrompt]);

  if (!needsBirthdatePrompt) return null;

  const handleConfirm = async () => {
    if (!picked) {
      setError(
        t('birthdatePrompt.required', {
          defaultValue: 'Please tap above to select your date of birth.',
        }),
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const iso = picked.toISOString().slice(0, 10);
      await setBirthdate(iso);
      track({ event: 'birthdate_prompt_confirmed' });
    } catch (e: any) {
      const msg = e?.message ?? 'Could not save your date of birth.';
      setError(msg);
      track({ event: 'birthdate_prompt_error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLater = async () => {
    track({ event: 'birthdate_prompt_dismissed' });
    await dismissBirthdatePrompt();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="user-check" size={22} color={colors.primary} />
          </View>

          <Text style={styles.title}>
            {t('birthdatePrompt.title', {
              defaultValue: 'Confirm your date of birth',
            })}
          </Text>
          <Text style={styles.subtitle}>
            {t('birthdatePrompt.subtitle', {
              defaultValue:
                'Kinetic is 18+. We use this only to verify eligibility and to let you redeem gift cards. We never share it.',
            })}
          </Text>

          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={18}
              color={colors.onSurfaceDim}
            />
            <Text
              style={[
                styles.dateText,
                !picked && { color: colors.onSurfaceDim },
              ]}
            >
              {picked
                ? picked.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : t('birthdatePrompt.placeholder', {
                    defaultValue: 'Tap to select',
                  })}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={picked ?? MAX_BIRTHDATE}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={MAX_BIRTHDATE}
              minimumDate={MIN_BIRTHDATE}
              onChange={(event, selected) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (event.type === 'dismissed') return;
                if (selected) setPicked(selected);
              }}
            />
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!picked || submitting) && styles.primaryButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!picked || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('birthdatePrompt.confirm', { defaultValue: 'Confirm' })}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLater}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              {t('birthdatePrompt.later', { defaultValue: 'Remind me later' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.onSurfaceDim,
    marginBottom: spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: spacing.md,
  },
  dateText: {
    ...typography.body,
    color: colors.onSurface,
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.background,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.onSurfaceDim,
  },
});
