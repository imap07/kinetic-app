import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { seasonsApi, SeasonStatus, SeasonTierView } from '../api/seasons';
import { colors, spacing } from '../theme';
import { AdBanner } from '../components/AdBanner';
import { useAds } from '../contexts/AdContext';
import { usePurchases } from '../contexts/PurchasesContext';

export function SeasonsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { tokens } = useAuth();
  const accessToken = tokens?.accessToken;
  const { trackAction, showRewardedInterstitial } = useAds();
  const { presentPaywall } = usePurchases();

  const [status, setStatus] = useState<SeasonStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await seasonsApi.current(accessToken);
      setStatus(res);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: t('common.error', { defaultValue: 'Something went wrong' }),
        text2: err?.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    load();
  }, [load]);

  const onClaim = useCallback(
    async (tier: number) => {
      if (!accessToken) return;
      setClaiming(tier);
      try {
        const res = await seasonsApi.claim(accessToken, tier);
        setStatus(res);
        Toast.show({
          type: 'success',
          text1: t('seasons.claimed', { defaultValue: 'Reward claimed' }),
        });
        // Right after a positive event (tier just claimed) is the
        // ideal moment for a rewarded interstitial — user is happy,
        // a +5 coin bonus on top of the tier reward feels generous,
        // and the format pays better than a forced interstitial.
        // We don't await this — the toast fires immediately, the ad
        // loads in the background.
        showRewardedInterstitial().catch(() => {});
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: t('seasons.claimFailed', { defaultValue: 'Could not claim' }),
          text2: err?.message,
        });
      } finally {
        setClaiming(null);
      }
    },
    [accessToken, t, trackAction],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!status || !status.season) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => navigation.goBack()} title={t('seasons.title', { defaultValue: 'Season Pass' })} />
        <Text style={styles.empty}>{t('seasons.none', { defaultValue: 'No active season right now. Check back soon.' })}</Text>
      </SafeAreaView>
    );
  }

  const pct = status.nextTier
    ? Math.min(
        1,
        status.points /
          (status.nextTier.pointsRequired || 1),
      )
    : 1;
  const endDate = new Date(status.season.endAt);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => navigation.goBack()} title={status.season.title} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroPoints}>{status.points.toLocaleString()}</Text>
          <Text style={styles.heroLabel}>
            {t('seasons.pointsThisSeason', { defaultValue: 'points this season' })}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.heroMeta}>
            {status.nextTier
              ? t('seasons.toNextTier', {
                  defaultValue: '{{n}} pts to Tier {{tier}}',
                  n: status.nextTier.pointsRemaining.toLocaleString(),
                  tier: status.nextTier.tier,
                })
              : t('seasons.maxTier', { defaultValue: 'Max tier reached' })}
          </Text>
          <Text style={styles.heroDays}>
            {t('seasons.daysLeft', { defaultValue: '{{n}} days left', n: daysLeft })}
          </Text>
        </View>

        {!status.isPro && (
          <TouchableOpacity
            style={styles.upsell}
            onPress={() => presentPaywall('organic')}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={16} color={colors.onPrimary} />
            <Text style={styles.upsellText}>
              {t('seasons.proUpsell', {
                defaultValue: 'Unlock Pro track for 2× rewards at every tier',
              })}
            </Text>
          </TouchableOpacity>
        )}

        {status.tiers.map((tier) => (
          <TierRow
            key={tier.tier}
            tier={tier}
            isPro={status.isPro}
            onClaim={onClaim}
            claiming={claiming === tier.tier}
          />
        ))}
      </ScrollView>
      <AdBanner placement="seasons" />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

function TierRow({
  tier,
  isPro,
  onClaim,
  claiming,
}: {
  tier: SeasonTierView;
  isPro: boolean;
  onClaim: (tier: number) => void;
  claiming: boolean;
}) {
  const { t } = useTranslation();
  const claimable =
    tier.unlocked &&
    (!tier.freeClaimed || (isPro && !tier.proClaimed));

  return (
    <View style={[styles.tierCard, !tier.unlocked && styles.tierLocked]}>
      <View style={styles.tierHead}>
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>{tier.tier}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tierLabel}>
            {t('seasons.tier', { defaultValue: 'Tier {{n}}', n: tier.tier })}
          </Text>
          <Text style={styles.tierMeta}>
            {t('seasons.pointsRequired', {
              defaultValue: '{{n}} pts',
              n: tier.pointsRequired.toLocaleString(),
            })}
          </Text>
        </View>
        {tier.unlocked ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        ) : (
          <Ionicons name="lock-closed" size={18} color={colors.onSurfaceDim} />
        )}
      </View>

      <View style={styles.tierRewards}>
        <RewardBox
          label={t('seasons.freeTrack', { defaultValue: 'Free' })}
          coins={tier.freeReward.coins}
          cosmeticKey={tier.freeReward.cosmeticKey}
          claimed={tier.freeClaimed}
        />
        <RewardBox
          label={t('seasons.proTrack', { defaultValue: 'Pro' })}
          coins={tier.proReward.coins}
          cosmeticKey={tier.proReward.cosmeticKey}
          claimed={tier.proClaimed}
          locked={!isPro}
        />
      </View>

      <TouchableOpacity
        style={[styles.claimBtn, !claimable && styles.claimBtnDisabled]}
        onPress={() => claimable && !claiming && onClaim(tier.tier)}
        disabled={!claimable || claiming}
        activeOpacity={0.85}
      >
        {claiming ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.claimBtnText}>
            {tier.freeClaimed && (!isPro || tier.proClaimed)
              ? t('seasons.claimed', { defaultValue: 'Claimed' })
              : !tier.unlocked
              ? t('seasons.locked', { defaultValue: 'Locked' })
              : t('seasons.claim', { defaultValue: 'Claim' })}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function RewardBox({
  label,
  coins,
  cosmeticKey,
  claimed,
  locked,
}: {
  label: string;
  coins: number;
  cosmeticKey: string | null;
  claimed: boolean;
  locked?: boolean;
}) {
  return (
    <View style={[styles.rewardBox, locked && styles.rewardBoxLocked]}>
      <Text style={styles.rewardLabel}>{label}</Text>
      <View style={styles.rewardRow}>
        <Ionicons name="logo-bitcoin" size={14} color={colors.primary} />
        <Text style={styles.rewardCoins}>{coins}</Text>
      </View>
      {cosmeticKey && (
        <Text style={styles.rewardExtra} numberOfLines={1}>
          + {cosmeticKey.replace('frame_', '').replace(/_/g, ' ')}
        </Text>
      )}
      {claimed && <Text style={styles.rewardClaimed}>✓</Text>}
    </View>
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
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 80, padding: 24 },
  heroCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  heroPoints: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 42,
    color: colors.primary,
  },
  heroLabel: { color: colors.onSurfaceVariant, marginBottom: 16 },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  heroMeta: { color: colors.onSurface, marginTop: 10, fontSize: 13 },
  heroDays: { color: colors.onSurfaceDim, fontSize: 12, marginTop: 4 },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  upsellText: { color: colors.onPrimary, fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  tierCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tierLocked: { opacity: 0.55 },
  tierHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  tierBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeText: { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
  tierLabel: { color: colors.onSurface, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  tierMeta: { color: colors.onSurfaceVariant, fontSize: 12 },
  tierRewards: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  rewardBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 10,
    padding: 10,
  },
  rewardBoxLocked: { opacity: 0.5 },
  rewardLabel: { color: colors.onSurfaceDim, fontSize: 11, marginBottom: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardCoins: { color: colors.onSurface, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 16 },
  rewardExtra: { color: colors.primary, fontSize: 11, marginTop: 2 },
  rewardClaimed: { color: colors.primary, position: 'absolute', top: 8, right: 10, fontSize: 14 },
  claimBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  claimBtnDisabled: { backgroundColor: colors.surfaceContainerHigh },
  claimBtnText: { color: colors.onPrimary, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
});
