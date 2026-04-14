import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../theme';
import { useCoins } from '../contexts/CoinContext';
import { useAuth } from '../contexts/AuthContext';
import { giftcardsApi } from '../api/giftcards';
import type { GiftcardCatalog, GiftcardCatalogItem, GiftcardRedemption } from '../api/giftcards';

type TabFilter = 'catalog' | 'history';

const TYPE_ICONS: Record<string, string> = {
  amazon: 'shopping-bag',
  playstation: 'play-circle',
  xbox: 'x-square',
  visa: 'credit-card',
};

export function GiftcardRedeemScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens } = useAuth();
  // For gift card redemption, only earned coins can be used. We still track
  // `available` for general display but gate redemption on `earnedCoins`.
  const { available, earnedCoins, refreshBalance } = useCoins();
  const { t } = useTranslation();

  const [tab, setTab] = useState<TabFilter>('catalog');
  const [catalog, setCatalog] = useState<GiftcardCatalog | null>(null);
  const [history, setHistory] = useState<GiftcardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const [cat, hist] = await Promise.all([
        giftcardsApi.getCatalog(tokens.accessToken),
        giftcardsApi.getMyRedemptions(tokens.accessToken),
      ]);
      setCatalog(cat);
      setHistory(hist.redemptions);
    } catch {
      // Fetch failed silently
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refreshBalance()]);
    setRefreshing(false);
  }, [fetchData, refreshBalance]);

  const handleRedeem = (card: GiftcardCatalogItem, denomination: { coins: number; dollarValue: number }) => {
    if (earnedCoins < denomination.coins) {
      const deficit = denomination.coins - earnedCoins;
      Alert.alert(
        t('giftcard.insufficientCoins'),
        `${t('coins.availableForRedemption')}: ${earnedCoins.toLocaleString()}\n\n${t('coins.needMore', { amount: deficit.toLocaleString() })}`,
      );
      return;
    }

    Alert.alert(
      t('giftcard.confirmRedemption'),
      `Redeem ${denomination.coins} coins for a $${denomination.dollarValue} ${card.name} gift card?\n\nProcessing takes up to ${catalog?.holdHours ?? 48} hours.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('giftcard.redeem'),
          onPress: async () => {
            setRedeeming(`${card.type}-${denomination.coins}`);
            try {
              await giftcardsApi.redeem(tokens!.accessToken, {
                coinsToSpend: denomination.coins,
                giftcardType: card.type,
              });
              await Promise.all([fetchData(), refreshBalance()]);
              Alert.alert(t('giftcard.redemptionSubmitted'), t('giftcard.redemptionSubmittedDesc'));
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message || t('giftcard.redemptionFailed'));
            } finally {
              setRedeeming(null);
            }
          },
        },
      ],
    );
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'processing': return colors.info;
      case 'pending_fulfillment': return colors.warning;
      case 'issued': return colors.secondary;
      case 'failed': return colors.error;
      default: return colors.onSurfaceDim;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('giftcard.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.balancePill}>
        <MaterialCommunityIcons name="circle-multiple" size={16} color={colors.primary} />
        <Text style={styles.balancePillText}>
          {t('coins.availableForRedemption')}: {earnedCoins.toLocaleString()} {t('coins.earned').toLowerCase()}
        </Text>
      </View>
      <Text style={styles.earnedOnlyNote}>
        {t('coins.earnedOnly')}
      </Text>

      <View style={styles.tabs}>
        {(['catalog', 'history'] as const).map((tabKey) => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tab, tab === tabKey && styles.tabActive]}
            onPress={() => setTab(tabKey)}
          >
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'catalog' ? t('giftcard.catalog') : t('giftcard.myRedemptions')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['4xl'] }} />
        ) : tab === 'catalog' ? (
          <>
            {catalog && (
              <Text style={styles.rateInfo}>
                Rate: {catalog.rateDescription}
              </Text>
            )}
            {catalog?.cards.map((card) => (
              <View key={card.type} style={styles.cardSection}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrap}>
                    <Feather
                      name={(TYPE_ICONS[card.type] ?? 'gift') as any}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.cardName}>{card.name}</Text>
                </View>

                <View style={styles.denomGrid}>
                  {card.denominations.map((denom) => {
                    const canAfford = earnedCoins >= denom.coins;
                    const isRedeeming = redeeming === `${card.type}-${denom.coins}`;
                    return (
                      <TouchableOpacity
                        key={denom.coins}
                        style={[styles.denomCard, !canAfford && styles.denomCardDisabled]}
                        activeOpacity={0.7}
                        disabled={!canAfford || !!redeeming}
                        onPress={() => handleRedeem(card, denom)}
                      >
                        <Text style={[styles.denomDollar, !canAfford && styles.denomTextDisabled]}>
                          ${denom.dollarValue}
                        </Text>
                        <View style={styles.denomCoinRow}>
                          {isRedeeming ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <MaterialCommunityIcons
                                name="circle-multiple"
                                size={12}
                                color={canAfford ? colors.primary : colors.onSurfaceDim}
                              />
                              <Text style={[styles.denomCoins, !canAfford && styles.denomTextDisabled]}>
                                {denom.coins.toLocaleString()}
                              </Text>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="gift" size={40} color={colors.onSurfaceDim} />
                <Text style={styles.emptyText}>{t('giftcard.noRedemptions')}</Text>
              </View>
            ) : (
              history.map((r) => (
                <View key={r._id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyLeft}>
                      <Feather
                        name={(TYPE_ICONS[r.giftcardType] ?? 'gift') as any}
                        size={18}
                        color={colors.onSurface}
                      />
                      <View>
                        <Text style={styles.historyType}>
                          {r.giftcardType.charAt(0).toUpperCase() + r.giftcardType.slice(1)} - ${r.dollarValue}
                        </Text>
                        <Text style={styles.historyDate}>
                          {new Date(r.requestedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.historyBadge, { backgroundColor: `${statusColor(r.status)}20` }]}>
                      <Text style={[styles.historyBadgeText, { color: statusColor(r.status) }]}>
                        {r.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyCoins}>
                      -{r.coinsSpent.toLocaleString()} coins
                    </Text>
                    {r.status === 'issued' && r.giftcardCode && (
                      <Text style={styles.historyCode}>
                        Code: {r.giftcardCode}
                      </Text>
                    )}
                    {r.status === 'failed' && r.failReason && (
                      <Text style={styles.historyFail}>
                        {r.failReason}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },

  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(202,253,0,0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  balancePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  earnedOnlyNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing['2xl'],
  },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.sm,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  tabActive: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceDim,
  },
  tabTextActive: {
    color: colors.onSurface,
  },

  scroll: { flex: 1 },

  rateInfo: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  cardSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(202,253,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: colors.onSurface,
  },

  denomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  denomCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 90,
  },
  denomCardDisabled: {
    opacity: 0.4,
  },
  denomDollar: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.onSurface,
  },
  denomCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  denomCoins: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  denomTextDisabled: {
    color: colors.onSurfaceDim,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },

  historyCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  historyType: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  historyDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
  historyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  historyBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  historyMeta: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  historyCoins: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  historyCode: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  historyFail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
