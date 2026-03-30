import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      setIsLoading(true);
      const data = await coinsApi.getBalance(tokens.accessToken);
      setWallet(data);
    } catch {
      // Balance fetch failed silently
    } finally {
      setIsLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (isAuthenticated && tokens?.accessToken) {
      refreshBalance();
    } else {
      setWallet({ balance: 0, lockedBalance: 0, available: 0, totalEarned: 0, totalSpent: 0 });
    }
  }, [isAuthenticated, tokens?.accessToken, refreshBalance]);

  const refreshBalanceAfterPurchase = useCallback(() => {
    const delays = [2000, 5000, 10000];
    delays.forEach((ms) => {
      setTimeout(() => refreshBalance(), ms);
    });
  }, [refreshBalance]);

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
