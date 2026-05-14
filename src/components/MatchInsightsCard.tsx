/**
 * Pre-match narrative card.
 *
 * Renders last-5 form pills per team + a list of rule-based
 * narrative strings ("Bayern on a 3-game winning streak").
 * Backed by GET /sports/:sport/games/:gameId/insights — pure
 * aggregation over data we already store, no AI, no extra spend.
 *
 * Auto-hides when the endpoint returns no form and no narratives
 * (e.g. unsupported sport, brand-new team with no history) so the
 * MatchPrediction screen doesn't flash an empty rail.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { sportsApi, type SportKey } from '../api/sports';
import { colors } from '../theme';

type Insights = Awaited<ReturnType<typeof sportsApi.getMatchInsights>>;

interface Props {
  sport: SportKey;
  gameApiId: number;
  homeTeamName: string;
  awayTeamName: string;
}

export function MatchInsightsCard({
  sport,
  gameApiId,
  homeTeamName,
  awayTeamName,
}: Props) {
  const { tokens } = useAuth();
  const [data, setData] = useState<Insights | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    let cancelled = false;
    sportsApi
      .getMatchInsights(tokens.accessToken, sport, gameApiId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken, sport, gameApiId]);

  const hasContent =
    !!data &&
    (data.homeForm.length > 0 ||
      data.awayForm.length > 0 ||
      data.narratives.length > 0);
  if (!hasContent) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Feather name="bar-chart-2" size={12} color={colors.primary} />
        <Text style={styles.eyebrow}>FORM</Text>
      </View>

      <View style={styles.teamRow}>
        <Text style={styles.teamName} numberOfLines={1}>
          {homeTeamName}
        </Text>
        <FormPills results={data!.homeForm} />
      </View>
      <View style={styles.teamRow}>
        <Text style={styles.teamName} numberOfLines={1}>
          {awayTeamName}
        </Text>
        <FormPills results={data!.awayForm} />
      </View>

      {data!.narratives.length > 0 && (
        <View style={styles.narrativeBlock}>
          {data!.narratives.map((n, i) => (
            <View key={i} style={styles.narrativeRow}>
              <View
                style={[
                  styles.dot,
                  n.kind === 'streak' ? styles.dotPrimary : styles.dotMuted,
                ]}
              />
              <Text style={styles.narrativeText}>{n.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function FormPills({ results }: { results: ('W' | 'L' | 'D')[] }) {
  if (results.length === 0) {
    return <Text style={styles.formEmpty}>—</Text>;
  }
  return (
    <View style={styles.pills}>
      {results.map((r, i) => (
        <View
          key={i}
          style={[
            styles.pill,
            r === 'W' && styles.pillWin,
            r === 'L' && styles.pillLoss,
            r === 'D' && styles.pillDraw,
          ]}
        >
          <Text
            style={[
              styles.pillText,
              r === 'W' && styles.pillTextWin,
              r === 'L' && styles.pillTextLoss,
              r === 'D' && styles.pillTextDraw,
            ]}
          >
            {r}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  teamName: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurface,
    marginRight: 8,
  },
  pills: {
    flexDirection: 'row',
    gap: 4,
  },
  formEmpty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
  },
  pill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillWin: { backgroundColor: 'rgba(202,253,0,0.18)' },
  pillLoss: { backgroundColor: 'rgba(244,67,54,0.18)' },
  pillDraw: { backgroundColor: 'rgba(255,255,255,0.08)' },
  pillText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  pillTextWin: { color: colors.primary },
  pillTextLoss: { color: colors.error },
  pillTextDraw: { color: colors.onSurfaceVariant },

  narrativeBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  narrativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotPrimary: { backgroundColor: colors.primary },
  dotMuted: { backgroundColor: colors.onSurfaceVariant },
  narrativeText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurface,
  },
});
