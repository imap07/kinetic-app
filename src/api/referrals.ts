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

export interface InvitedFriend {
  referralId: string;
  refereeDisplayName: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'blocked';
  picksResolved: number;
  picksNeeded: number;
  qualifiedAt: string | null;
  rewardedAt: string | null;
}

export const referralsApi = {
  getStatus(token: string) {
    return apiClient.get<ReferralStatus>('/referrals/me', { token });
  },

  // Per-friend progress: "Carlos: 1/3 picks resolved". Used by
  // ReferralsScreen to make the abstract aggregate counts feel
  // tangible — knowing which specific friend is one pick away from
  // converting drives more outreach than seeing "1 pending".
  getFriends(token: string) {
    return apiClient.get<InvitedFriend[]>('/referrals/friends', { token });
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
