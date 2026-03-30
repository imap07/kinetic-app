import { apiClient } from './client';

export interface WalletBalance {
  balance: number;
  lockedBalance: number;
  available: number;
  totalEarned: number;
  totalSpent: number;
}

export interface CoinTransaction {
  _id: string;
  userId: string;
  type: 'purchase' | 'subscription_grant' | 'league_entry' | 'league_winnings' | 'giftcard_redemption' | 'refund';
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
  priceUsd: number;
  priceDisplay: string;
}

export interface CoinPackagesResponse {
  packages: CoinPackage[];
  subscription: {
    id: string;
    monthlyCoins: number;
    priceDisplay: string;
  };
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
