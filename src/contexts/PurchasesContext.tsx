import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Toast from 'react-native-toast-message';
import i18n from '../i18n';
import { useAuth } from './AuthContext';
import { logSubscriptionStart, track } from '../services/analytics';
import {
  trackPaywallSeen,
  trackPaywallDismissed,
  secondsSince,
} from '../utils/analytics';

// Where the paywall was opened from — drives the GA4 `paywall_seen.source`
// funnel. RevenueCat itself owns the paywall UI (layout, insets, products);
// these are only our analytics labels for the entry point.
export type PaywallSource =
  | 'remove_ads_banner'
  | 'coin_store'
  | 'profile'
  | 'post_onboarding'
  | 'organic';

// RevenueCat requires platform-specific public SDK keys.
// - iOS  → appl_...  (rejected on Android)
// - Android → goog_... (rejected on iOS)
// Both keys are public/safe to ship in the bundle. Sandbox vs production is
// decided by the build itself (TestFlight/Debug → sandbox, App Store release
// → production), not by the key.
const REVENUECAT_API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
      ''
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

const ENTITLEMENT_ID = 'Kinetic App Pro';

interface PurchasesState {
  isProMember: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isReady: boolean;
}

interface PurchasesContextValue extends PurchasesState {
  presentPaywall: (source?: PaywallSource) => Promise<boolean>;
  manageSubscriptions: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
}

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<PurchasesState>({
    isProMember: false,
    customerInfo: null,
    currentOffering: null,
    isReady: false,
  });

  useEffect(() => {
    async function init() {
      try {
        if (!REVENUECAT_API_KEY) {
          console.warn('RevenueCat API key not configured, skipping initialization');
          setState((s) => ({ ...s, isReady: true }));
          return;
        }

        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        }

        Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        setState((s) => ({ ...s, isReady: true }));
      } catch (error) {
        console.warn('RevenueCat initialization failed:', error);
        setState((s) => ({ ...s, isReady: true }));
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!state.isReady) return;

    if (isAuthenticated && user?.id) {
      Purchases.logIn(user.id).then(({ customerInfo }) => {
        updateFromCustomerInfo(customerInfo);
      }).catch(() => {});
    } else {
      Purchases.isAnonymous().then((isAnon) => {
        if (!isAnon) {
          return Purchases.logOut();
        }
      }).catch(() => {});
      setState((s) => ({
        ...s,
        isProMember: false,
        customerInfo: null,
      }));
    }
  }, [state.isReady, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!state.isReady) return;

    const listener = (info: CustomerInfo) => {
      updateFromCustomerInfo(info);
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [state.isReady]);

  useEffect(() => {
    if (!state.isReady) return;

    Purchases.getOfferings()
      .then((offerings) => {
        const current = offerings.current ?? null;
        if (__DEV__) {
          console.log('[RevenueCat] Offerings loaded. Current:', current?.identifier);
          console.log('[RevenueCat] Available packages:', current?.availablePackages?.length ?? 0);
          current?.availablePackages?.forEach((p) => {
            console.log(`  📦 ${p.identifier} → product: ${p.product?.identifier} (${p.product?.priceString})`);
          });
          console.log('[RevenueCat] .monthly:', current?.monthly?.identifier ?? 'null');
          console.log('[RevenueCat] .annual:', current?.annual?.identifier ?? 'null');
        }
        setState((s) => ({
          ...s,
          currentOffering: current,
        }));
      })
      .catch((err) => {
        console.warn('[RevenueCat] Failed to fetch offerings:', err);
      });
  }, [state.isReady]);

  const updateFromCustomerInfo = useCallback((info: CustomerInfo) => {
    const isPro =
      typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    setState((s) => ({
      ...s,
      customerInfo: info,
      isProMember: isPro,
    }));
  }, []);

  const presentPaywall = useCallback(
    async (source: PaywallSource = 'organic'): Promise<boolean> => {
      // Present RevenueCat's own native paywall modal. RC controls the entire
      // UI — products, prices, trial copy, layout AND system-bar insets — so
      // it never descuadra on Android edge-to-edge and never advertises a
      // trial the product doesn't offer. We only wrap it with the funnel
      // analytics (seen → converted | dismissed) the old embedded screen had.
      const startedAt = Date.now();
      trackPaywallSeen(source);
      try {
        const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall({
          // Pin to the current offering so the paywall always matches the
          // products this build expects; falls back to RC's "current".
          offering: state.currentOffering ?? undefined,
          displayCloseButton: true,
        });

        switch (paywallResult) {
          case PAYWALL_RESULT.PURCHASED:
          case PAYWALL_RESULT.RESTORED: {
            const info = await Purchases.getCustomerInfo();
            updateFromCustomerInfo(info);
            logSubscriptionStart(paywallResult === PAYWALL_RESULT.PURCHASED ? 'new' : 'restored');
            return true;
          }
          case PAYWALL_RESULT.NOT_PRESENTED:
          case PAYWALL_RESULT.ERROR:
          case PAYWALL_RESULT.CANCELLED:
          default:
            // Left without converting — close the funnel with a dismissal so
            // "saw → converted" vs "saw → left" stays clean.
            trackPaywallDismissed(source, secondsSince(startedAt));
            return false;
        }
      } catch {
        trackPaywallDismissed(source, secondsSince(startedAt));
        return false;
      }
    },
    [updateFromCustomerInfo, state.currentOffering],
  );

  // Open the store's native subscription-management screen (App Store /
  // Google Play). This is what an existing Pro should get when they tap
  // "Manage subscription" — RevenueCat routes to the correct store so we
  // never build or maintain our own cancel/upgrade UI. Best-effort: on
  // failure (e.g. nothing to manage) we swallow rather than crash.
  const manageSubscriptions = useCallback(async (): Promise<void> => {
    try {
      await Purchases.showManageSubscriptions();
    } catch (error) {
      console.warn('[RevenueCat] showManageSubscriptions failed:', error);
    }
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      updateFromCustomerInfo(customerInfo);
      logSubscriptionStart(pkg.identifier);
      // Typed paywall_converted event for the Monetization funnel.
      // We classify subscriptions vs coin packs by `productCategory`
      // (RevenueCat exposes 'SUBSCRIPTION' for autorenewing plans and
      // 'NON_SUBSCRIPTION' for consumables like coin packs). Plan
      // shape is `monthly | annual` from the package's period type.
      // Trial detection: RevenueCat returns the active entitlement
      // with `periodType` of `intro`/`trial` on first conversion.
      if (pkg.product.productCategory === 'SUBSCRIPTION') {
        const isAnnual =
          pkg.identifier.includes('annual') ||
          pkg.identifier.includes('year') ||
          pkg.product.identifier.includes('annual');
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        const trialUsed = entitlement?.periodType === 'TRIAL' || entitlement?.periodType === 'INTRO';
        track({
          event: 'paywall_converted',
          plan: isAnnual ? 'annual' : 'monthly',
          trialUsed,
          // Static "purchase" trigger here because the caller (Paywall
          // or CoinStore) doesn't pass the original CTA. The
          // paywall_shown event already carries the trigger so the
          // funnel can stitch on user+timestamp.
          trigger: 'purchase',
        }).catch(() => {});
      } else {
        // Non-subscription = coin pack. Use the existing coin_purchase
        // event so the monetization dashboard captures both paths.
        const priceUsd = typeof pkg.product.price === 'number' ? pkg.product.price : 0;
        track({
          event: 'coin_purchase',
          pack: pkg.product.identifier,
          priceUsd,
        }).catch(() => {});
      }
      return true;
    } catch (e: any) {
      if (!e.userCancelled) {
        Toast.show({
          type: 'error',
          text1: i18n.t('purchases.purchaseFailed'),
          text2: e.message || i18n.t('common.pleaseTryAgain'),
        });
      }
      return false;
    }
  }, [updateFromCustomerInfo]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      updateFromCustomerInfo(info);
      return typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    } catch {
      return false;
    }
  }, [updateFromCustomerInfo]);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      updateFromCustomerInfo(customerInfo);
    } catch {
      // Error fetching customer info
    }
  }, [updateFromCustomerInfo]);

  const value: PurchasesContextValue = {
    ...state,
    presentPaywall,
    manageSubscriptions,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
  };

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases(): PurchasesContextValue {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error('usePurchases must be used within a PurchasesProvider');
  }
  return ctx;
}
