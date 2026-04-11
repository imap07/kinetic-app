import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

/**
 * Keep this list in sync with the backend enum `AcquisitionSource`
 * in /src/users/schemas/user.schema.ts. The `key` values are the
 * wire format — they're sent verbatim in the onboarding payload and
 * validated against @IsEnum(AcquisitionSource) on the API side.
 */
export type AcquisitionSourceKey =
  | 'instagram'
  | 'tiktok'
  | 'friend'
  | 'appstore'
  | 'google'
  | 'youtube'
  | 'twitter'
  | 'other';

interface SourceOption {
  key: AcquisitionSourceKey;
  labelKey: string;
  fallback: string;
  iconFamily: 'ionicons' | 'mci' | 'fa5';
  icon: string;
  color: string;
}

const SOURCES: SourceOption[] = [
  { key: 'instagram', labelKey: 'acquisitionSource.instagram', fallback: 'Instagram', iconFamily: 'fa5', icon: 'instagram', color: '#E1306C' },
  { key: 'tiktok',    labelKey: 'acquisitionSource.tiktok',    fallback: 'TikTok',    iconFamily: 'fa5', icon: 'tiktok',    color: '#69C9D0' },
  { key: 'youtube',   labelKey: 'acquisitionSource.youtube',   fallback: 'YouTube',   iconFamily: 'fa5', icon: 'youtube',   color: '#FF0000' },
  { key: 'twitter',   labelKey: 'acquisitionSource.twitter',   fallback: 'X / Twitter', iconFamily: 'fa5', icon: 'twitter', color: '#FFFFFF' },
  { key: 'friend',    labelKey: 'acquisitionSource.friend',    fallback: 'A friend',  iconFamily: 'ionicons', icon: 'people', color: '#5BEF90' },
  { key: 'appstore',  labelKey: 'acquisitionSource.appstore',  fallback: 'App Store', iconFamily: 'ionicons', icon: 'logo-apple', color: '#A78BFA' },
  { key: 'google',    labelKey: 'acquisitionSource.google',    fallback: 'Google search', iconFamily: 'fa5', icon: 'google', color: '#FBBF24' },
  { key: 'other',     labelKey: 'acquisitionSource.other',     fallback: 'Somewhere else', iconFamily: 'mci', icon: 'dots-horizontal-circle', color: '#94A3B8' },
];

interface Props {
  onComplete: (source: AcquisitionSourceKey | null) => void;
  onBack?: () => void;
}

/**
 * "How did you hear about us?" — optional self-reported attribution step.
 *
 * Shown once during onboarding between team selection and the final
 * completion screen. Result is attached to the /auth/onboarding payload
 * so it lands on the user document in a single write. The user can
 * always skip without penalty — we'd rather have no data than garbage.
 */
export function AcquisitionSourceScreen({ onComplete, onBack }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AcquisitionSourceKey | null>(null);

  const handleContinue = useCallback(() => {
    onComplete(selected);
  }, [selected, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete(null);
  }, [onComplete]);

  const canContinue = selected !== null;

  const renderIcon = (source: SourceOption) => {
    const iconColor = source.color;
    if (source.iconFamily === 'fa5') {
      return <FontAwesome5 name={source.icon as any} size={20} color={iconColor} />;
    }
    if (source.iconFamily === 'mci') {
      return <MaterialCommunityIcons name={source.icon as any} size={22} color={iconColor} />;
    }
    return <Ionicons name={source.icon as any} size={22} color={iconColor} />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        )}
        <Text style={styles.stepLabel}>
          {t('acquisitionSource.step', 'Step 3 of 3')}
        </Text>
        <Text style={styles.title}>
          {t('acquisitionSource.title', 'How did you hear about us?')}
        </Text>
        <Text style={styles.subtitle}>
          {t(
            'acquisitionSource.subtitle',
            "Totally optional — it just helps us know where our fans come from.",
          )}
        </Text>
      </View>

      {/* Options list */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {SOURCES.map((source) => {
          const isSel = selected === source.key;
          return (
            <TouchableOpacity
              key={source.key}
              style={[
                styles.optionRow,
                isSel && { borderColor: source.color, backgroundColor: source.color + '10' },
              ]}
              onPress={() => setSelected(source.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: source.color + '18' }]}>
                {renderIcon(source)}
              </View>

              <Text style={styles.optionText} numberOfLines={1}>
                {t(source.labelKey, source.fallback)}
              </Text>

              <View
                style={[
                  styles.radioOuter,
                  isSel && { borderColor: source.color },
                ]}
              >
                {isSel && (
                  <View style={[styles.radioInner, { backgroundColor: source.color }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={!canContinue}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={
              canContinue
                ? ['#E8FF8A', '#CAFD00']
                : ['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.04)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Text style={[styles.ctaText, canContinue && styles.ctaTextActive]}>
              {t('acquisitionSource.continue', 'CONTINUE')}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={canContinue ? '#4A5E00' : 'rgba(202,253,0,0.3)'}
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>
            {t('acquisitionSource.skip', 'Skip for now')}
          </Text>
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
    gap: 4,
  },
  backButton: {
    marginBottom: 8,
    marginLeft: -6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
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
    color: 'rgba(202,253,0,0.3)',
    letterSpacing: 1.2,
  },
  ctaTextActive: { color: '#3A4A00' },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  skipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
});
