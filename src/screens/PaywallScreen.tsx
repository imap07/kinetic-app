import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { ModalCloseButton } from '../components';
import { usePurchases } from '../contexts/PurchasesContext';
import type { RootStackParamList, PaywallTrigger } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const FEATURES = [
  { icon: 'infinite-outline' as const, text: 'Unlimited daily predictions' },
  { icon: 'football-outline' as const, text: 'All 6 sports unlocked' },
  { icon: 'shield-checkmark-outline' as const, text: 'Premium leagues (UCL, MLS, Copa Libertadores...)' },
  { icon: 'analytics-outline' as const, text: 'Exact Score predictions (2.5x bonus)' },
  { icon: 'stats-chart-outline' as const, text: 'Detailed stats & weekly trends' },
  { icon: 'trophy-outline' as const, text: 'Full leaderboard access' },
];

function getContextCard(trigger: PaywallTrigger, params: Props['route']['params']) {
  switch (trigger) {
    case 'daily_limit':
      return {
        icon: 'time-outline' as const,
        title: `You've used ${params.dailyUsed ?? 3}/${params.dailyLimit ?? 3} free picks today`,
        subtitle: 'Upgrade for unlimited daily predictions',
      };
    case 'exact_score':
      return {
        icon: 'bullseye' as const,
        title: 'Exact Score is a Pro feature',
        subtitle: 'Earn 2.5x bonus points with precise predictions',
      };
    case 'sport_locked':
      return {
        icon: 'lock-closed-outline' as const,
        title: `${params.sportName ?? 'This sport'} is a Pro feature`,
        subtitle: 'Unlock all 6 sports with Kinetic Pro',
      };
    case 'detailed_stats':
      return {
        icon: 'bar-chart-outline' as const,
        title: 'Detailed Stats are Pro-only',
        subtitle: 'See your performance breakdown by sport and week',
      };
    case 'premium_league':
      return {
        icon: 'trophy-outline' as const,
        title: params.sportName ? `${params.sportName}` : 'Premium League',
        subtitle: params.sportName
          ? `${params.sportName} is a Pro-only league. Upgrade to unlock all leagues worldwide`
          : 'Unlock access to all 1,000+ leagues worldwide',
      };
    case 'quest_multi_sport':
      return {
        icon: 'trophy-outline' as const,
        title: 'Complete your Daily Challenge!',
        subtitle: 'Unlock all sports to cover 2+ and earn bonus rewards',
      };
    case 'general':
    default:
      return {
        icon: 'flash-outline' as const,
        title: 'Take your predictions to the next level',
        subtitle: 'Join thousands of Pro predictors',
      };
  }
}

export function PaywallScreen({ navigation, route }: Props) {
  const { trigger, sportName, dailyUsed, dailyLimit } = route.params;
  const {
    currentOffering,
    purchasePackage,
    restorePurchases,
    isProMember,
  } = usePurchases();

  const context = getContextCard(trigger, route.params);

  const monthlyPkg = currentOffering?.monthly ?? null;
  const annualPkg = currentOffering?.annual ?? null;

  const monthlyPrice = monthlyPkg?.product?.priceString ?? '$2.99';
  const annualPrice = annualPkg?.product?.priceString ?? '$24.99';

  const handlePurchase = useCallback(async (type: 'monthly' | 'annual') => {
    const pkg = type === 'monthly' ? monthlyPkg : annualPkg;
    if (!pkg) {
      Alert.alert('Not Available', 'This plan is not available right now. Please try again later.');
      return;
    }
    const success = await purchasePackage(pkg);
    if (success) {
      navigation.goBack();
    }
  }, [monthlyPkg, annualPkg, purchasePackage, navigation]);

  const handleRestore = useCallback(async () => {
    const restored = await restorePurchases();
    if (restored) {
      Alert.alert('Restored', 'Your Pro subscription has been restored.');
      navigation.goBack();
    } else {
      Alert.alert('Nothing to Restore', 'No active subscription found for this account.');
    }
  }, [restorePurchases, navigation]);

  if (isProMember) {
    navigation.goBack();
    return null;
  }

  return (
    <View style={styles.container}>
      <ModalCloseButton onClose={() => navigation.goBack()} variant="fullscreen" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(202,253,0,0.15)', 'rgba(202,253,0,0)']}
            style={styles.headerGlow}
          />
          <View style={styles.iconCircle}>
            <Ionicons name="flash" size={32} color={colors.primary} />
          </View>
          <Text style={styles.brandLabel}>KINETIC PRO</Text>
          <Text style={styles.headline}>Unlock Your Full Potential</Text>
        </View>

        {/* Context Card */}
        <View style={styles.contextCard}>
          <Ionicons
            name={context.icon as any}
            size={20}
            color={colors.primary}
          />
          <View style={styles.contextTextWrap}>
            <Text style={styles.contextTitle}>{context.title}</Text>
            <Text style={styles.contextSubtitle}>{context.subtitle}</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color={colors.background} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Social Proof */}
        <View style={styles.socialProof}>
          <MaterialCommunityIcons name="account-group" size={16} color={colors.primary} />
          <Text style={styles.socialProofText}>
            Join the best predictors on Kinetic Pro
          </Text>
        </View>

        {/* Pricing */}
        <View style={styles.pricingSection}>
          <TouchableOpacity
            style={styles.pricingCardPrimary}
            onPress={() => handlePurchase('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE 30%</Text>
            </View>
            <Text style={styles.pricingLabel}>Annual</Text>
            <Text style={styles.pricingAmount}>{annualPrice}/year</Text>
            <Text style={styles.pricingDetail}>7-day free trial, cancel anytime</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pricingCardSecondary}
            onPress={() => handlePurchase('monthly')}
            activeOpacity={0.8}
          >
            <Text style={styles.pricingLabel}>Monthly</Text>
            <Text style={styles.pricingAmount}>{monthlyPrice}/month</Text>
            <Text style={styles.pricingDetail}>Cancel anytime</Text>
          </TouchableOpacity>
        </View>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legalText}>
          Payment will be charged to your App Store account. Subscription automatically
          renews unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  headerGlow: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(202,253,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 3,
    color: colors.primary,
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  contextCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(202,253,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
  },
  contextTextWrap: {
    flex: 1,
    gap: 4,
  },
  contextTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },
  contextSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },

  featuresSection: {
    gap: 14,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    flex: 1,
  },

  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 12,
    marginBottom: 28,
  },
  socialProofText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    flex: 1,
  },

  pricingSection: {
    gap: 12,
    marginBottom: 20,
  },
  pricingCardPrimary: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  saveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: colors.background,
  },
  pricingCardSecondary: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  pricingLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  pricingAmount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
  },
  pricingDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceDim,
  },

  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  legalText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },
});
