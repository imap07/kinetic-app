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
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useAuth } from './AuthContext';

const API_KEY = 'test_QZBrSvEcPpbCyNxZsvWAQMpdOTF';

const ENTITLEMENT_ID = 'Kinetic App Pro';

interface PurchasesState {
  isProMember: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isReady: boolean;
}

interface PurchasesContextValue extends PurchasesState {
  presentPaywall: () => Promise<boolean>;
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
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      }

      if (Platform.OS === 'ios') {
        Purchases.configure({ apiKey: API_KEY });
      } else if (Platform.OS === 'android') {
        Purchases.configure({ apiKey: API_KEY });
      }

      setState((s) => ({ ...s, isReady: true }));
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
        setState((s) => ({
          ...s,
          currentOffering: offerings.current ?? null,
        }));
      })
      .catch(() => {});
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

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    try {
      const paywallResult: PAYWALL_RESULT =
        await RevenueCatUI.presentPaywall();

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED: {
          const info = await Purchases.getCustomerInfo();
          updateFromCustomerInfo(info);
          return true;
        }
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        case PAYWALL_RESULT.CANCELLED:
          return false;
        default:
          return false;
      }
    } catch {
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
