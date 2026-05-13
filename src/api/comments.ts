import { apiClient } from './client';

export interface PickComment {
  id: string;
  userId: string;
  displayName: string;
  avatar: string | null;
  body: string;
  createdAt: string; // ISO
  isMine: boolean;
}

export interface PickCommentsPage {
  items: PickComment[];
  nextCursor: string | null;
}

export const commentsApi = {
  list(
    token: string,
    predictionId: string,
    opts?: { limit?: number; cursor?: string },
  ) {
    const qs = new URLSearchParams();
    if (opts?.limit) qs.set('limit', String(opts.limit));
    if (opts?.cursor) qs.set('cursor', opts.cursor);
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiClient.get<PickCommentsPage>(
      `/picks/${predictionId}/comments${suffix}`,
      { token },
    );
  },

  create(token: string, predictionId: string, body: string) {
    return apiClient.post<PickComment>(
      `/picks/${predictionId}/comments`,
      { body },
      { token },
    );
  },

  batchCount(token: string, predictionIds: string[]) {
    return apiClient.post<Record<string, number>>(
      '/picks/comments/batch-count',
      { predictionIds },
      { token },
    );
  },

  remove(token: string, commentId: string) {
    return apiClient.delete<{ deleted: true }>(
      `/picks/comments/${commentId}`,
      { token },
    );
  },
};
