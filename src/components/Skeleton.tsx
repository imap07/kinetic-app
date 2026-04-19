/**
 * Generic skeleton loader.
 *
 * Replaces ActivityIndicator spinners on content-shaped screens. The
 * subtle 1.2s shimmer conveys "content is coming" instead of "frozen" —
 * a measurable UX win in perceived-performance tests.
 *
 * Usage
 * -----
 *   <Skeleton height={72} radius={12} />
 *   <Skeleton height={16} width="60%" />
 *   <SkeletonGroup>
 *     <Skeleton height={140} />
 *     <Skeleton height={16} style={{ marginTop: 12 }} />
 *   </SkeletonGroup>
 *
 * Design notes
 * ------------
 * • One Animated.Value per Skeleton instance — RN's shared animations
 *   could pool this, but in practice each screen mounts <10 skeletons
 *   and the cost is negligible. Keeps the component self-contained.
 * • Drives opacity, not translateX (no gradient shimmer). Opacity is
 *   native-driver compatible and never drops frames during heavy
 *   network parsing. Pure shimmer gradients on RN require Reanimated
 *   and a masked view — overkill for a v1.1 polish pass.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface SkeletonProps {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ height = 16, width = '100%', radius = 8, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          height,
          width: width as any,
          borderRadius: radius,
          backgroundColor: colors.surfaceContainerHigh,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/**
 * Convenience layout wrapper — purely semantic, doesn't add styling.
 * Pairs with <Skeleton> to document intent at call sites.
 */
export function SkeletonGroup({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}
