import { apiClient } from './client';

export interface WalletBalance {
  balance: number;
  lockedBalance: number;
  available: number;
  totalEarned: number;
  totalSpent: number;
  earnedCoins: number;
  purchasedCoins: number;
}

export interface CoinTransaction {
  _id: string;
  userId: string;
  type:
    | 'purchase'
    | 'subscription_grant'
    | 'league_entry'
    | 'league_winnings'
    | 'giftcard_redemption'
    | 'refund'
    | 'welcome_bonus';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface CoinTransactionsResponse {
  transactions: CoinTransaction[];
  total: number;
  page: number;
  pages: number;
}

export interface CoinPackage {
  id: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  priceUsd: number;
  priceDisplay: string;
  tag: string | null;
}

export interface CoinPackagesResponse {
  packages: CoinPackage[];
  subscription: {
    id: string;
    annualId: string;
    monthlyCoins: number;
    monthlyPriceDisplay: string;
    annualPriceDisplay: string;
  };
  leagueEntryFeeTiers: number[];
}

export const coinsApi = {
  getBalance(token: string) {
    return apiClient.get<WalletBalance>('/coins/balance', { token });
  },

  getTransactions(token: string, page = 1, limit = 20) {
    return apiClient.get<CoinTransactionsResponse>(
      `/coins/transactions?page=${page}&limit=${limit}`,
      { token },
    );
  },

  getPackages(token: string) {
    return apiClient.get<CoinPackagesResponse>('/coins/packages', { token });
  },
};
