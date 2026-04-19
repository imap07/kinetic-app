/**
 * "Next up for you" hero card.
 *
 * Sits at the top of the Dashboard and surfaces the single most
 * relevant upcoming game for this user:
 *   priority 1 — a game involving a favorite team that hasn't been
 *                picked yet, kicking off within the next 24h
 *   priority 2 — the closest upcoming game in the currently-active
 *                sport tab (fallback when no favorite is playing)
 *
 * One tap lands on the MatchPrediction screen with the winner tab
 * pre-selected. Reduces the core journey from 3–4 taps to 1, which
 * the UX audit called the single biggest lift for a return-user
 * dashboard.
 *
 * Feature-flag gated via `next_up_hero` so we can A/B it vs the old
 * plain grid in production without a redeploy.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import type { SportGame } from '../api/sports';

interface Props {
  game: SportGame;
  isFavoriteTeam: boolean;
  onPress: () => void;
}

function relativeTime(dateStr: string): string {
  const target = new Date(dateStr).getTime();
  const diffMin = Math.round((target - Date.now()) / 60_000);
  if (diffMin < 60) return `in ${Math.max(1, diffMin)} min`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `in ${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return `in ${diffDay}d`;
}

export function NextUpHero({ game, isFavoriteTeam, onPress }: Props) {
  const heroLabel = isFavoriteTeam ? 'A FAVORITE IS PLAYING' : 'NEXT UP';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Predict ${game.homeTeam?.name} vs ${game.awayTeam?.name}`}
      style={styles.container}
    >
      <LinearGradient
        colors={['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <Text style={styles.label}>{heroLabel}</Text>
          <Text style={styles.time}>{relativeTime(game.date)}</Text>
        </View>

        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            {game.homeTeam?.logo ? (
              <ExpoImage
                source={{ uri: game.homeTeam.logo }}
                style={styles.teamLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : null}
            <Text style={styles.teamName} numberOfLines={1}>
              {game.homeTeam?.name}
            </Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.teamCol}>
            {game.awayTeam?.logo ? (
              <ExpoImage
                source={{ uri: game.awayTeam.logo }}
                style={styles.teamLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : null}
            <Text style={styles.teamName} numberOfLines={1}>
              {game.awayTeam?.name}
            </Text>
          </View>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>MAKE YOUR PICK</Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.25)',
    padding: 16,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  time: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: { width: 52, height: 52 },
  teamName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'center',
  },
  vs: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    width: 32,
    textAlign: 'center',
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.primary,
  },
});
