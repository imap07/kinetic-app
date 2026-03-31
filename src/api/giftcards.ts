import { apiClient } from './client';

export interface GiftcardDenomination {
  coins: number;
  dollarValue: number;
}

export interface GiftcardCatalogItem {
  type: string;
  name: string;
  minCoins: number;
  denominations: GiftcardDenomination[];
}

export interface GiftcardCatalog {
  rate: number;
  rateDescription: string;
  holdHours: number;
  minRedemptionCoins: number;
  monthlyCapUsd: number;
  cards: GiftcardCatalogItem[];
}

export interface GiftcardRedemption {
  _id: string;
  userId: string;
  coinsSpent: number;
  giftcardType: string;
  dollarValue: number;
  status: 'pending' | 'processing' | 'pending_fulfillment' | 'issued' | 'failed';
  giftcardCode?: string;
  requestedAt: string;
  issuedAt?: string;
  failReason?: string;
}

export interface RedemptionsResponse {
  redemptions: GiftcardRedemption[];
  total: number;
  page: number;
  pages: number;
}

export const giftcardsApi = {
  getCatalog(token: string) {
    return apiClient.get<GiftcardCatalog>('/giftcards/catalog', { token });
  },

  redeem(token: string, body: { coinsToSpend: number; giftcardType: string }) {
    return apiClient.post<GiftcardRedemption>('/giftcards/redeem', body, { token });
  },

  getMyRedemptions(token: string, page = 1, limit = 20) {
    return apiClient.get<RedemptionsResponse>(
      `/giftcards/my-redemptions?page=${page}&limit=${limit}`,
      { token },
    );
  },
};
