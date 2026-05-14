import { apiClient } from './client';

export type CosmeticCategory = 'frame' | 'badge';
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticDef {
  key: string;
  category: CosmeticCategory;
  name: string;
  rarity: CosmeticRarity;
  source: 'season' | 'grant' | 'shop';
}

export interface CosmeticInventory {
  ownedKeys: string[];
  equipped: { frame: string | null; badge: string | null };
}

export const cosmeticsApi = {
  catalog: (token: string) =>
    apiClient.get<{ catalog: CosmeticDef[] }>('/cosmetics/catalog', { token }),
  me: (token: string) =>
    apiClient.get<CosmeticInventory>('/cosmetics/me', { token }),
  equip: (token: string, key: string | null, category?: CosmeticCategory) =>
    apiClient.post<CosmeticInventory>(
      '/cosmetics/equip',
      { key, category },
      { token },
    ),
};
