import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../contexts/AdContext';
import { colors } from '../theme';

interface AdBannerProps {
  /** Where this banner is placed — for analytics */
  placement?: string;
  /** Size variant */
  size?: BannerAdSize;
}

/**
 * Smart banner that auto-hides for Pro users.
 * Drop this anywhere in the UI: <AdBanner placement="dashboard" />
 */
export function AdBanner({ placement, size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER }: AdBannerProps) {
  const { adsEnabled, bannerAdUnitId } = useAds();

  if (!adsEnabled) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={bannerAdUnitId}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={() => {
          // Silent fail — don't break UI
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: colors.background,
  },
});
