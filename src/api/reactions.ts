import { apiClient } from './client';
import type { PickReactionKey } from '../shared/domain';

export interface ReactionSummary {
  counts: Record<string, number>;
  myReactions: PickReactionKey[];
}

export interface ToggleReactionResponse {
  added: boolean;
  summary: ReactionSummary;
}

export const reactionsApi = {
  toggle(token: string, predictionId: string, emoji: PickReactionKey) {
    return apiClient.post<ToggleReactionResponse>(
      `/reactions/picks/${predictionId}`,
      { emoji },
      { token },
    );
  },

  get(token: string, predictionId: string) {
    return apiClient.get<ReactionSummary>(`/reactions/picks/${predictionId}`, { token });
  },

  batch(token: string, predictionIds: string[]) {
    return apiClient.post<Record<string, ReactionSummary>>(
      '/reactions/picks/batch',
      { predictionIds },
      { token },
    );
  },
};
