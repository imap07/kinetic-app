import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Driver = {
  position: number;
  name: string;
  teamName?: string;
  logo?: string;
  number?: number;
};

type Props = {
  drivers: Driver[];
};

/**
 * F1-style starting grid: staggered 2-column layout like real F1 grids.
 * Odd positions on the left (pole side), even on the right.
 */
export function F1StartingGrid({ drivers }: Props) {
  if (!drivers.length) return null;

  const sorted = [...drivers].sort((a, b) => a.position - b.position);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>STARTING GRID</Text>
      <View style={styles.grid}>
        {/* Track lines */}
        <View style={styles.trackLineLeft} />
        <View style={styles.trackLineRight} />
        <View style={styles.trackLineCenter} />

        {sorted.map((driver, idx) => {
          const isLeft = driver.position % 2 === 1; // Odd = left (pole side)
          const rowIndex = Math.floor((driver.position - 1) / 2);

          return (
            <View
              key={driver.position}
              style={[
                styles.driverSlot,
                {
                  top: rowIndex * 64 + 8,
                  [isLeft ? 'left' : 'right']: 16,
                },
              ]}
            >
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>P{driver.position}</Text>
              </View>
              <View style={styles.driverInfo}>
                {driver.logo ? (
                  <Image source={{ uri: driver.logo }} style={styles.driverLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.driverLogoFallback}>
                    <Text style={styles.driverNumber}>{driver.number || driver.position}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName} numberOfLines={1}>{driver.name}</Text>
                  {driver.teamName && (
                    <Text style={styles.teamName} numberOfLines={1}>{driver.teamName}</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const GRID_ROW_HEIGHT = 64;

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: colors.onSurfaceVariant,
    letterSpacing: 1.5, textAlign: 'center',
  },
  grid: {
    position: 'relative',
    minHeight: 10 * GRID_ROW_HEIGHT + 16, // 20 drivers = 10 rows
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  trackLineLeft: {
    position: 'absolute', left: '25%', top: 0, bottom: 0,
    width: 2, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  trackLineRight: {
    position: 'absolute', right: '25%', top: 0, bottom: 0,
    width: 2, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  trackLineCenter: {
    position: 'absolute', left: '50%', top: 0, bottom: 0,
    width: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    // dashed effect via segments not possible in RN, use solid subtle line
  },
  driverSlot: {
    position: 'absolute',
    width: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  positionBadge: {
    width: 28, height: 28, borderRadius: 4,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  positionText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  driverInfo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,38,43,0.6)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  driverLogo: { width: 24, height: 24, borderRadius: 12 },
  driverLogoFallback: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  driverNumber: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, color: colors.onSurfaceVariant,
  },
  driverName: {
    fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onSurface,
    letterSpacing: 0.2,
  },
  teamName: {
    fontFamily: 'Inter_500Medium', fontSize: 8, color: colors.onSurfaceDim,
  },
});
