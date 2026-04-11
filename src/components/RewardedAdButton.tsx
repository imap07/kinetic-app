import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useAds } from '../contexts/AdContext';
import { colors } from '../theme';

/**
 * "Watch ad → Earn 20 coins" button.
 * Auto-hides for Pro users and when daily limit is reached.
 */
export function RewardedAdButton() {
  const { t } = useTranslation();
  const { adsEnabled, showRewardedAd, rewardedAdsRemaining } = useAds();
  const [loading, setLoading] = useState(false);

  if (!adsEnabled || rewardedAdsRemaining <= 0) return null;

  const handlePress = async () => {
    setLoading(true);
    try {
      const result = await showRewardedAd();
      if (result.coins > 0) {
        Toast.show({
          type: 'success',
          text1: `+${result.coins} coins!`,
          text2: t('ads.rewardEarned'),
          visibilityTime: 2500,
        });
        return;
      }

      // Non-success paths — each gets a distinct toast so the user knows
      // whether to try again, come back tomorrow, or check their network.
      switch (result.error) {
        case 'daily_limit':
          Toast.show({
            type: 'info',
            text1: t('ads.dailyLimitTitle'),
            text2: t('ads.dailyLimitDesc'),
            visibilityTime: 3000,
          });
          break;
        case 'ad_unavailable':
          Toast.show({
            type: 'info',
            text1: t('ads.notReadyTitle'),
            text2: t('ads.notReadyDesc'),
            visibilityTime: 2500,
          });
          break;
        case 'network':
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: t('ads.networkError'),
            visibilityTime: 3000,
          });
          break;
        case 'aborted':
          // User dismissed the ad early — no toast, the absence of a
          // reward is signal enough.
          break;
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('common.somethingWrong'),
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} disabled={loading} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="play-circle" size={20} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{t('ads.watchAd')}</Text>
        <Text style={styles.subtitle}>
          {t('ads.remaining', { count: rewardedAdsRemaining })}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.coinBadge}>
          <MaterialCommunityIcons name="circle-multiple" size={14} color={colors.primary} />
          <Text style={styles.coinText}>+20</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(202,253,0,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.12)',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(202,253,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(202,253,0,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
});
