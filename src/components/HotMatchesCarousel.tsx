/**
 * Cross-sport "Today's Heat" carousel.
 *
 * Surfaces the matches with the most predictions placed across the
 * network in the last 24h, regardless of the user's primary sport.
 * Designed for the anti-bounce case: when the user's favourite
 * sport has no games today they otherwise see an empty dashboard.
 * Always visible (not just on quiet days) so cross-sport discovery
 * happens organically.
 *
 * Tap → navigates to the MatchPrediction screen for that game,
 * which is what most users would want to do next anyway.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { sportsApi, type HottestMatch, SPORT_TABS } from '../api/sports';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export function HotMatchesCarousel() {
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<HottestMatch[] | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    let cancelled = false;
    sportsApi
      .getHottestToday(tokens.accessToken, 5)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  // Hidden while loading and when zero results — the dashboard
  // already has enough hero surfaces, no need to flash an empty
  // section header.
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>
          {t('hotMatches.title', { defaultValue: "🔥 TODAY'S HEAT" })}
        </Text>
        <Text style={styles.subtitle}>
          {t('hotMatches.subtitle', {
            defaultValue: 'Most-picked across all sports',
          })}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((m) => {
          const sportMeta = SPORT_TABS.find((s) => s.key === m.sport);
          const kickoff = formatKickoff(m.gameDate, t);
          return (
            <TouchableOpacity
              key={`${m.sport}:${m.gameApiId}`}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => {
                // MatchPrediction loads its own game details from the
                // backend given (fixtureApiId, sport) — we just hand
                // it the routing tuple instead of trying to pre-fill.
                navigation.navigate('MatchPrediction', {
                  fixtureApiId: m.gameApiId,
                  sport: m.sport,
                });
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.sportLabel} numberOfLines={1}>
                  {sportMeta?.name ?? m.sport.toUpperCase()}
                </Text>
                <View style={styles.heatBadge}>
                  <Feather name="trending-up" size={10} color="#4A5E00" />
                  <Text style={styles.heatBadgeText}>{m.predictionCount}</Text>
                </View>
              </View>

              <View style={styles.teamsRow}>
                <Logo uri={m.homeTeamLogo} />
                <Text style={styles.vs}>vs</Text>
                <Logo uri={m.awayTeamLogo} />
              </View>

              <Text style={styles.teamsLine} numberOfLines={1}>
                {m.homeTeamName}
              </Text>
              <Text style={styles.teamsLine} numberOfLines={1}>
                {m.awayTeamName}
              </Text>
              <Text style={styles.kickoff}>{kickoff}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Logo({ uri }: { uri: string | null }) {
  if (uri) {
    return <ExpoImage source={{ uri }} style={styles.logo} contentFit="contain" />;
  }
  return <View style={styles.logoFallback} />;
}

function formatKickoff(iso: string, t: any): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < -180) return d.toLocaleDateString();
  if (diffMin < -1) return t('hotMatches.live', { defaultValue: 'LIVE' });
  if (diffMin < 60) {
    return t('hotMatches.inMin', { defaultValue: 'in {{n}}m', n: Math.max(1, diffMin) });
  }
  if (diffMin < 24 * 60) {
    return t('hotMatches.inHr', {
      defaultValue: 'in {{n}}h',
      n: Math.round(diffMin / 60),
    });
  }
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 168,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.15)',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sportLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    flex: 1,
  },
  heatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  heatBadgeText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    color: '#4A5E00',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  logo: { width: 32, height: 32 },
  logoFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  vs: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  teamsLine: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'center',
  },
  kickoff: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
});
