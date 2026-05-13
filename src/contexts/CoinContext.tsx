import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { coinsApi } from '../api/coins';
import type { WalletBalance } from '../api/coins';

interface CoinGainEvent {
  amount: number;
  at: number; // epoch ms — also serves as unique id for re-triggering animations
}

interface CoinContextValue {
  balance: number;
  lockedBalance: number;
  available: number;
  totalEarned: number;
  totalSpent: number;
  earnedCoins: number;
  purchasedCoins: number;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
  refreshBalanceAfterPurchase: () => void;
  // Last detected positive delta between successive refreshes. Used by
  // <CoinGainToast/> to surface a celebratory "+X KC" without each
  // call site having to manage its own animation state.
  lastGain: CoinGainEvent | null;
}

const CoinContext = createContext<CoinContextValue | null>(null);

export function CoinProvider({ children }: { children: React.ReactNode }) {
  const { tokens, isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<WalletBalance>({
    balance: 0,
    lockedBalance: 0,
    available: 0,
    totalEarned: 0,
    totalSpent: 0,
    earnedCoins: 0,
    purchasedCoins: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastGain, setLastGain] = useState<CoinGainEvent | null>(null);
  // Keep the previous balance in a ref so React 18 doesn't double-fire
  // the gain detection in strict mode, and so we can compare across
  // closures without stale state. `null` means "first load — don't
  // celebrate, the user didn't just earn anything".
  const prevBalanceRef = useRef<number | null>(null);
  // First refresh after sign-in should not toast a "+X" — that
  // amount is the user's whole wallet, not a gain.
  const skipNextGainRef = useRef(true);

  const refreshBalance = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      setIsLoading(true);
      const data = await coinsApi.getBalance(tokens.accessToken);
      const prev = prevBalanceRef.current;
      prevBalanceRef.current = data.balance;
      setWallet(data);
      if (skipNextGainRef.current) {
        skipNextGainRef.current = false;
      } else if (prev != null && data.balance > prev) {
        setLastGain({ amount: data.balance - prev, at: Date.now() });
      }
    } catch (err) {
      console.warn('[CoinContext] Failed to fetch balance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (isAuthenticated && tokens?.accessToken) {
      // Fresh sign-in window: reset the gain-detection state so the
      // first balance arriving after auth isn't mis-rendered as a
      // huge "+X KC" toast.
      skipNextGainRef.current = true;
      prevBalanceRef.current = null;
      refreshBalance();
    } else {
      setWallet({ balance: 0, lockedBalance: 0, available: 0, totalEarned: 0, totalSpent: 0, earnedCoins: 0, purchasedCoins: 0 });
      prevBalanceRef.current = null;
      skipNextGainRef.current = true;
      setLastGain(null);
    }
  }, [isAuthenticated, tokens?.accessToken, refreshBalance]);

  const purchaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const refreshBalanceAfterPurchase = useCallback(() => {
    // Clear any pending timers from a previous purchase call
    purchaseTimersRef.current.forEach(clearTimeout);
    purchaseTimersRef.current = [];

    const delays = [2000, 5000, 10000];
    delays.forEach((ms) => {
      const id = setTimeout(() => refreshBalance(), ms);
      purchaseTimersRef.current.push(id);
    });
  }, [refreshBalance]);

  // Cleanup purchase timers on unmount
  useEffect(() => {
    return () => {
      purchaseTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const value: CoinContextValue = {
    ...wallet,
    isLoading,
    refreshBalance,
    refreshBalanceAfterPurchase,
    lastGain,
  };

  return (
    <CoinContext.Provider value={value}>
      {children}
    </CoinContext.Provider>
  );
}

export function useCoins(): CoinContextValue {
  const ctx = useContext(CoinContext);
  if (!ctx) {
    throw new Error('useCoins must be used within a CoinProvider');
  }
  return ctx;
}
