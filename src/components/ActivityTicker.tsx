/**
 * Activity ticker — a one-line strip near the top of the Home
 * dashboard that cycles through anonymous network stats and recent
 * named wins/streaks every few seconds. Makes the app feel
 * populated by surfacing other users' activity without dropping
 * into a full social feed.
 *
 * Items come from GET /sports/activity-ticker, which already
 * enforces the public-profile flag — clients render whatever the
 * API returns.
 *
 * Refresh cadence: every 60s while mounted. Auto-hidden when the
 * server returns 0 items (e.g. brand-new install with no traffic).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { sportsApi } from '../api/sports';
import { colors } from '../theme';

type Item = { kind: 'count' | 'win' | 'streak'; text: string };

const ROTATE_MS = 4000;
const REFRESH_MS = 60_000;

export function ActivityTicker() {
  const { tokens } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  // Periodic backend refresh — keeps the ticker fresh without
  // websockets or push.
  useEffect(() => {
    if (!tokens?.accessToken) return;
    let cancelled = false;
    const fetch = async () => {
      try {
        const data = await sportsApi.getActivityTicker(tokens.accessToken);
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setItems((prev) => prev ?? []);
      }
    };
    fetch();
    const id = setInterval(fetch, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tokens?.accessToken]);

  // Cross-fade between items.
  useEffect(() => {
    if (!items || items.length < 2) return;
    const id = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setIndex((i) => (i + 1) % items.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [items, opacity]);

  if (!items || items.length === 0) return null;
  const current = items[index] ?? items[0];

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Feather
          name={
            current.kind === 'win'
              ? 'trending-up'
              : current.kind === 'streak'
                ? 'zap'
                : 'activity'
          }
          size={12}
          color={colors.primary}
        />
      </View>
      <Animated.Text style={[styles.text, { opacity }]} numberOfLines={1}>
        {current.text}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(202,253,0,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.20)',
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(202,253,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
