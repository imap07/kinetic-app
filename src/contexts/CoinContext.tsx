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

  const refreshBalance = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      setIsLoading(true);
      const data = await coinsApi.getBalance(tokens.accessToken);
      setWallet(data);
    } catch (err) {
      console.warn('[CoinContext] Failed to fetch balance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (isAuthenticated && tokens?.accessToken) {
      refreshBalance();
    } else {
      setWallet({ balance: 0, lockedBalance: 0, available: 0, totalEarned: 0, totalSpent: 0, earnedCoins: 0, purchasedCoins: 0 });
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
