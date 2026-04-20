import { apiClient } from './client';

export interface ReferralStatus {
  code: string;
  rewardCoins: number;
  qualifyPicks: number;
  totalReferred: number;
  qualified: number;
  rewarded: number;
  pending: number;
  coinsEarned: number;
  wasReferred: boolean;
}

export interface ApplyReferralResponse {
  applied: true;
  referrerDisplayName: string;
  blocked?: boolean;
}

export const referralsApi = {
  getStatus(token: string) {
    return apiClient.get<ReferralStatus>('/referrals/me', { token });
  },

  apply(token: string, code: string) {
    return apiClient.post<ApplyReferralResponse>(
      '/referrals/apply',
      { code: code.trim().toUpperCase() },
      { token },
    );
  },
};

/**
 * Public referral URL. Landing page at kineticapp.ca has a /r/[code]
 * route that redirects to the App Store / Play Store (and attempts
 * a deep-link `kinetic://r/<code>` if the app is installed).
 */
export function buildReferralUrl(code: string): string {
  return `https://kineticapp.ca/r/${encodeURIComponent(code)}`;
}
