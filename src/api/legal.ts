import { apiClient } from './client';

export interface LegalDocument {
  type: 'terms' | 'privacy';
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
}

export const legalApi = {
  getTerms() {
    return apiClient.get<LegalDocument>('/legal/terms');
  },

  getPrivacy() {
    return apiClient.get<LegalDocument>('/legal/privacy');
  },
};
