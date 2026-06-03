/**
 * Active rivalries card for the Dashboard.
 *
 * Why this lives on the Dashboard (not Profile):
 * The retention audit flagged that rivalries are the single strongest
 * social retention loop in the product — losing a head-to-head creates
 * an explicit return trigger ("get back to win it") that streaks and
 * leagues don't. But the entry point was buried two tabs deep under
 * Profile, so most users never discovered the feature.
 *
 * Rendering rules:
 * - Hidden entirely when the user has no incoming + no active rivalries.
 *   We don't want to teach a discovery-via-empty-state moment here; the
 *   Profile entry stays as the path to first-create a rivalry, and this
 *   card surfaces only when there's already activity to react to.
 * - Incoming pending challenges render with explicit Accept/Decline
 *   actions so the user can resolve them inline without leaving the
 *   Dashboard. Pending challenges are time-sensitive (24h TTL), so
 *   single-tap resolution matters.
 * - Active rivalries render the score in head-to-head framing
 *   ("X 2 – 1 Y") so the user instantly sees if they're leading or
 *   trailing. Tapping the card routes to the Rivalries tab to drill in.
 *
 * The fetch is owned by the parent (Dashboard) so a refresh from
 * pull-to-refresh re-hits this card too without us managing our own
 * polling.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Rivalry, RivalriesResponse } from '../api/rivalries';

interface Props {
  data: RivalriesResponse | null;
  busyIds?: Set<string>;
  onAccept: (rivalryId: string) => void;
  onDecline: (rivalryId: string) => void;
  /** Opens the full Rivalries screen (cross-stack via tab nav). */
  onOpenAll: () => void;
}

export function RivalriesCard({ data, busyIds, onAccept, onDecline, onOpenAll }: Props) {
  const { t } = useTranslation();

  if (!data) return null;

  const { incoming, active } = data;
  // Render only when there's something worth interrupting the user about.
  // Empty incoming + empty active = stay invisible.
  if (incoming.length === 0 && active.length === 0) return null;

  // Cap the visible list — the dashboard is dense enough already. Anything
  // beyond the first 2 active + 1 incoming gets collapsed into a footer
  // link to the full Rivalries screen.
  const visibleIncoming = incoming.slice(0, 1);
  const visibleActive = active.slice(0, 2);
  const overflow =
    Math.max(0, incoming.length - visibleIncoming.length) +
    Math.max(0, active.length - visibleActive.length);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="zap" size={14} color={colors.primary} />
          <Text style={styles.headerTitle}>
            {t('rivalriesCard.title', 'Rivalries')}
          </Text>
        </View>
        <TouchableOpacity onPress={onOpenAll} hitSlop={8}>
          <Text style={styles.headerLink}>{t('common.seeAll', 'See all')}</Text>
        </TouchableOpacity>
      </View>

      {visibleIncoming.map((r) => {
        const busy = busyIds?.has(r.id) ?? false;
        return (
          <View key={r.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowName} numberOfLines={1}>
                {r.challengerName}
              </Text>
              <Text style={styles.rowSub}>
                {t('rivalriesCard.challengedYou', 'challenged you · {{sport}}', {
                  sport: r.sport,
                })}
              </Text>
            </View>
            {busy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => onDecline(r.id)}
                  style={styles.declineBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.decline', 'Decline')}
                  hitSlop={8}
                >
                  <Feather name="x" size={14} color={colors.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onAccept(r.id)}
                  style={styles.acceptBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.accept', 'Accept')}
                  hitSlop={8}
                >
                  <Text style={styles.acceptBtnText}>
                    {t('common.accept', 'Accept')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {visibleActive.map((r) => (
        <ActiveRivalryRow key={r.id} rivalry={r} onPress={onOpenAll} />
      ))}

      {overflow > 0 && (
        <TouchableOpacity onPress={onOpenAll} style={styles.overflowRow}>
          <Text style={styles.overflowText}>
            {t('rivalriesCard.moreCount', '+{{count}} more', { count: overflow })}
          </Text>
          <Feather name="chevron-right" size={14} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActiveRivalryRow({ rivalry, onPress }: { rivalry: Rivalry; onPress: () => void }) {
  const { t } = useTranslation();
  // Show the head-to-head score from the viewer's perspective so they
  // see "me 2 — 1 them" not "X 2 — 1 Y" (which forces the user to
  // remember which name is theirs). Wins are resolved-stat values; for
  // a still-running rivalry we display "—" until the first resolution.
  const stats = rivalry.resolvedStats;
  const myWins = rivalry.iAmChallenger
    ? stats?.challengerWins ?? 0
    : stats?.opponentWins ?? 0;
  const theirWins = rivalry.iAmChallenger
    ? stats?.opponentWins ?? 0
    : stats?.challengerWins ?? 0;
  const theirName = rivalry.iAmChallenger ? rivalry.opponentName : rivalry.challengerName;
  const leading = myWins > theirWins;
  const trailing = myWins < theirWins;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>
          vs {theirName}
        </Text>
        <Text style={styles.rowSub}>
          {rivalry.sport} ·{' '}
          {leading
            ? t('rivalriesCard.leading', 'leading')
            : trailing
              ? t('rivalriesCard.trailing', 'trailing')
              : t('rivalriesCard.tied', 'tied')}
        </Text>
      </View>
      <View style={styles.scoreBlock}>
        <Text style={[styles.score, leading && styles.scoreLeading, trailing && styles.scoreTrailing]}>
          {myWins} – {theirWins}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    ...typography.bodyMd,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerLink: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  rowMain: {
    flex: 1,
  },
  rowName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  rowSub: {
    ...typography.bodySm,
    color: colors.secondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  declineBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    fontSize: 11,
    color: '#0B0E11',
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scoreBlock: {
    paddingLeft: spacing.sm,
  },
  score: {
    ...typography.bodyLg,
    fontWeight: '800',
    color: colors.onSurface,
  },
  scoreLeading: {
    color: colors.primary,
  },
  scoreTrailing: {
    color: '#FCA5A5',
  },
  overflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  overflowText: {
    ...typography.bodySm,
    color: colors.secondary,
  },
});
