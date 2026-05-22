import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  cosmeticsApi,
  CosmeticCategory,
  CosmeticDef,
  CosmeticInventory,
} from '../api/cosmetics';
import { colors, spacing } from '../theme';
import { AdBanner } from '../components/AdBanner';

// Category list. Labels are resolved at render time via
// `t('cosmetics.frames')` / `t('cosmetics.badges')` — see usage below.
const CATEGORIES: { key: CosmeticCategory }[] = [
  { key: 'frame' },
  { key: 'badge' },
];

const RARITY_COLOR: Record<string, string> = {
  common: '#7E8085',
  rare: '#4FC3F7',
  epic: '#A855F7',
  legendary: '#CAFD00',
};

export function CosmeticsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { tokens } = useAuth();
  const accessToken = tokens?.accessToken;

  const [catalog, setCatalog] = useState<CosmeticDef[]>([]);
  const [inv, setInv] = useState<CosmeticInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CosmeticCategory>('frame');
  const [equipping, setEquipping] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [c, m] = await Promise.all([
        cosmeticsApi.catalog(accessToken),
        cosmeticsApi.me(accessToken),
      ]);
      setCatalog(c.catalog);
      setInv(m);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.message ?? t('common.error') });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => catalog.filter((c) => c.category === category),
    [catalog, category],
  );

  const onEquip = useCallback(
    async (key: string, cat: CosmeticCategory) => {
      if (!accessToken) return;
      setEquipping(key);
      try {
        const isEquipped = inv?.equipped[cat] === key;
        const res = await cosmeticsApi.equip(
          accessToken,
          isEquipped ? null : key,
          cat,
        );
        setInv(res);
      } catch (err: any) {
        Toast.show({ type: 'error', text1: err?.message ?? t('common.error') });
      } finally {
        setEquipping(null);
      }
    },
    [accessToken, inv],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const ownedSet = new Set(inv?.ownedKeys ?? []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('cosmetics.title', { defaultValue: 'Cosmetics' })}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabs}>
        {CATEGORIES.map((c) => {
          const active = c.key === category;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t(`cosmetics.${c.key}s`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {visible.map((def) => {
          const owned = ownedSet.has(def.key);
          const isEquipped = inv?.equipped[def.category] === def.key;
          return (
            <View key={def.key} style={[styles.card, !owned && styles.cardLocked]}>
              <View style={[styles.placeholder, { borderColor: RARITY_COLOR[def.rarity] }]}>
                <Text style={styles.placeholderText}>
                  {def.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{def.name}</Text>
                <Text style={[styles.cardRarity, { color: RARITY_COLOR[def.rarity] }]}>
                  {def.rarity.toUpperCase()}
                </Text>
                <Text style={styles.cardSource}>
                  {t(`cosmetics.source.${def.source}`, {
                    defaultValue: def.source === 'season' ? 'Season reward' : def.source === 'shop' ? 'Shop' : 'Grant',
                  })}
                </Text>
              </View>
              {owned ? (
                <TouchableOpacity
                  style={[styles.equipBtn, isEquipped && styles.equipBtnActive]}
                  onPress={() => onEquip(def.key, def.category)}
                  disabled={equipping === def.key}
                  activeOpacity={0.85}
                >
                  {equipping === def.key ? (
                    <ActivityIndicator size="small" color={isEquipped ? colors.onPrimary : colors.onSurface} />
                  ) : (
                    <Text style={[styles.equipBtnText, isEquipped && styles.equipBtnTextActive]}>
                      {isEquipped
                        ? t('cosmetics.equipped', { defaultValue: 'Equipped' })
                        : t('cosmetics.equip', { defaultValue: 'Equip' })}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.lockBox}>
                  <Ionicons name="lock-closed" size={16} color={colors.onSurfaceDim} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <AdBanner placement="cosmetics" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: 8,
    marginBottom: spacing.sm,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.onSurfaceVariant, fontFamily: 'Inter_500Medium' },
  tabTextActive: { color: colors.onPrimary },
  list: { padding: spacing.md, paddingBottom: spacing.xl, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  cardLocked: { opacity: 0.6 },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  placeholderText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: colors.onSurface,
  },
  cardName: { color: colors.onSurface, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  cardRarity: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginTop: 2 },
  cardSource: { color: colors.onSurfaceDim, fontSize: 11, marginTop: 2 },
  equipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 10,
  },
  equipBtnActive: { backgroundColor: colors.primary },
  equipBtnText: { color: colors.onSurface, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  equipBtnTextActive: { color: colors.onPrimary },
  lockBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
