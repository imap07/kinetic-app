import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import RevenueCatUI from 'react-native-purchases-ui';
import { usePurchases } from '../contexts/PurchasesContext';
import type { RootStackParamList, PaywallTrigger } from '../navigation/types';
import {
  trackPaywallSeen,
  trackPaywallDismissed,
  trackSubscriptionTapped,
  secondsSince,
} from '../utils/analytics';

// Map nav-level PaywallTrigger to the GA4 `paywall_seen.source` union.
// Kept here (not in utils/analytics) so future trigger additions stay
// co-located with where the paywall actually opens.
function triggerToSource(
  trigger: PaywallTrigger,
): 'remove_ads_banner' | 'coin_store' | 'profile' | 'post_onboarding' | 'organic' {
  switch (trigger) {
    case 'remove_ads':
      return 'remove_ads_banner';
    case 'post_onboarding':
      return 'post_onboarding';
    case 'general':
    default:
      return 'organic';
  }
}

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

/**
 * Pro paywall — renders the RevenueCat-hosted paywall designed in the
 * RevenueCat dashboard and attached to the current offering (`default`).
 *
 * Why the RC component instead of a hand-built UI: RevenueCat resolves
 * products, prices, intro/free-trial copy AND trial eligibility straight
 * from the store, so the paywall can never advertise a trial the product
 * doesn't actually offer (the bug class the old custom paywall had), and
 * the design can be updated from the dashboard without an app release.
 *
 * NOTE: the paywall's appearance lives entirely in the RevenueCat
 * dashboard. This screen only hosts it and wires navigation + analytics.
 * If no paywall is published for the offering, the component falls back
 * to RevenueCat's default template.
 */
export function PaywallScreen({ navigation, route }: Props) {
  const { trigger } = route.params;
  const { currentOffering, isProMember } = usePurchases();

  const source = triggerToSource(trigger);
  const openedAtRef = useRef(Date.now());
  const purchasedRef = useRef(false);

  useEffect(() => {
    trackPaywallSeen(source);
    return () => {
      // RevenueCat fires `purchase_completed` itself; on unmount we only
      // emit `paywall_dismissed` when the user left WITHOUT purchasing,
      // so the funnel cleanly separates "saw → converted" vs "saw → left".
      if (!purchasedRef.current) {
        trackPaywallDismissed(source, secondsSince(openedAtRef.current));
      }
    };
  }, [source]);

  // Already Pro (e.g. restored on another device, or entitlement granted
  // while this was open) — there's nothing to sell, so close immediately.
  useEffect(() => {
    if (isProMember) {
      purchasedRef.current = true; // not a dismissal — suppress the event
      navigation.goBack();
    }
  }, [isProMember, navigation]);

  const handleClose = () => navigation.goBack();

  const handlePurchased = () => {
    // Suppress the dismissed event from the unmount effect — we closed
    // because the user converted, not because they bailed.
    purchasedRef.current = true;
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        style={styles.paywall}
        options={{
          // Explicitly pin to the current offering when we have it so the
          // displayed paywall always matches the products this build
          // expects; falls back to RevenueCat's "current" otherwise.
          offering: currentOffering ?? undefined,
          displayCloseButton: true,
        }}
        onPurchaseStarted={({ packageBeingPurchased }) => {
          // Preserve the GA4 `subscription_tapped` funnel event the old
          // custom paywall fired on plan tap. RC's package types map
          // 1:1 to our two plans; anything else (shouldn't happen with a
          // Monthly+Annual-only offering) is ignored.
          const pkgType = packageBeingPurchased?.packageType;
          if (pkgType === 'ANNUAL') trackSubscriptionTapped('annual');
          else if (pkgType === 'MONTHLY') trackSubscriptionTapped('monthly');
        }}
        onPurchaseCompleted={handlePurchased}
        onRestoreCompleted={({ customerInfo }) => {
          // Only treat a restore as success (and close) if it actually
          // granted an entitlement; otherwise let RevenueCat show its
          // built-in "nothing to restore" feedback and keep the paywall.
          if (Object.keys(customerInfo.entitlements.active).length > 0) {
            handlePurchased();
          }
        }}
        onDismiss={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  paywall: { flex: 1 },
});
