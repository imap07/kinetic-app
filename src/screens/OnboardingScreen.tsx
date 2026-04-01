import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ONBOARDING_COMPLETE_KEY = '@kinetic_onboarding_done';

interface OnboardingStep {
  id: string;
  icon: string;
  iconLib: 'ion' | 'mci';
  titleKey: string;
  subtitleKey: string;
  featureKeys: string[];
  accentColor: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'predict',
    icon: 'target',
    iconLib: 'mci',
    titleKey: 'onboarding.slide1Title',
    subtitleKey: 'onboarding.slide1Subtitle',
    featureKeys: [
      'onboarding.slide1Feature1',
      'onboarding.slide1Feature2',
      'onboarding.slide1Feature3',
    ],
    accentColor: '#CAFD00',
  },
  {
    id: 'earn',
    icon: 'trending-up',
    iconLib: 'ion',
    titleKey: 'onboarding.slide2Title',
    subtitleKey: 'onboarding.slide2Subtitle',
    featureKeys: [
      'onboarding.slide2Feature1',
      'onboarding.slide2Feature2',
      'onboarding.slide2Feature3',
    ],
    accentColor: '#FC5B00',
  },
  {
    id: 'compete',
    icon: 'podium-outline',
    iconLib: 'ion',
    titleKey: 'onboarding.slide3Title',
    subtitleKey: 'onboarding.slide3Subtitle',
    featureKeys: [
      'onboarding.slide3Feature1',
      'onboarding.slide3Feature2',
      'onboarding.slide3Feature3',
    ],
    accentColor: '#4FC3F7',
  },
];

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useTranslation();

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = async () => {
    finishOnboarding();
  };

  const finishOnboarding = async () => {
    // Note: ONBOARDING_COMPLETE_KEY is now set AFTER league selection,
    // not here. This allows the user to go through slides → pick leagues → enter app.
    onComplete();
  };

  const isLastStep = currentIndex === STEPS.length - 1;

  const renderStep = ({ item }: { item: OnboardingStep }) => (
    <View style={[stepStyles.container, { width: SCREEN_WIDTH }]}>
      <View style={stepStyles.content}>
        <View style={[stepStyles.iconCircle, { shadowColor: item.accentColor }]}>
          {item.iconLib === 'ion' ? (
            <Ionicons name={item.icon as any} size={48} color={item.accentColor} />
          ) : (
            <MaterialCommunityIcons name={item.icon as any} size={48} color={item.accentColor} />
          )}
        </View>

        <Text style={stepStyles.title}>{t(item.titleKey)}</Text>
        <Text style={stepStyles.subtitle}>{t(item.subtitleKey)}</Text>

        <View style={stepStyles.featureList}>
          {item.featureKeys.map((featureKey) => (
            <View key={featureKey} style={stepStyles.featureRow}>
              <View style={[stepStyles.featureDot, { backgroundColor: item.accentColor }]} />
              <Text style={stepStyles.featureText}>{t(featureKey)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLastStep && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* Steps */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        keyExtractor={(item) => item.id}
        renderItem={renderStep}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Bottom controls */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((step, idx) => (
            <View
              key={step.id}
              style={[
                styles.dot,
                idx === currentIndex && styles.dotActive,
                idx === currentIndex && { backgroundColor: STEPS[currentIndex].accentColor },
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleNext} style={styles.ctaWrap}>
          <LinearGradient
            colors={isLastStep ? ['#F3FFCA', '#CAFD00'] : ['rgba(202,253,0,0.15)', 'rgba(202,253,0,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Text style={[styles.ctaText, isLastStep && styles.ctaTextFinal]}>
              {isLastStep ? t('onboarding.getStarted') : t('onboarding.next')}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={isLastStep ? '#4A5E00' : colors.primary}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  skipBtn: {
    position: 'absolute', top: 60, right: 24, zIndex: 10,
  },
  skipText: {
    fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurfaceVariant,
  },

  bottomSection: {
    paddingHorizontal: 24, paddingBottom: 48, gap: 24,
  },

  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.surfaceContainerHighest,
  },
  dotActive: {
    width: 24, borderRadius: 4,
  },

  ctaWrap: { borderRadius: borderRadius.sm, overflow: 'hidden' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 32, borderRadius: borderRadius.sm, gap: 8,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.primary, letterSpacing: 1,
  },
  ctaTextFinal: { color: '#4A5E00' },
});

const stepStyles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  content: { alignItems: 'center', gap: 20, width: '100%' },

  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20,
    marginBottom: 8,
  },

  title: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, lineHeight: 38,
    color: colors.onSurface, textAlign: 'center', letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24,
    color: colors.onSurfaceVariant, textAlign: 'center',
    maxWidth: 300,
  },

  featureList: { gap: 12, marginTop: 8, width: '100%' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: {
    fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20,
    color: colors.onSurface, flex: 1,
  },
});
