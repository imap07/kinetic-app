/**
 * Friends-rank dashboard card.
 *
 * Two states served by the same component:
 *   1) User has 0 friends in the referral graph → invite CTA that
 *      navigates straight into Referrals. This is the "promote
 *      referrals from home" surface — previously buried four taps
 *      deep under Profile.
 *   2) User has 1+ friends → "You're #X of Y" + a tap-through to
 *      the FriendsLeaderboard. Without this, the Friends board was
 *      a pull-only feature: zero awareness in the main flow.
 *
 * Loads its own data so the dashboard doesn't have to plumb friend
 * state through. Failures degrade quietly — the card just hides,
 * never crashes the screen.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { streaksApi } from '../api/streaks';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onPressInvite: () => void;
  onPressLeaderboard: () => void;
}

interface FriendRow {
  userId: string;
  currentStreak: number;
  isMe: boolean;
}

export function FriendsRankCard({ onPressInvite, onPressLeaderboard }: Props) {
  const { t } = useTranslation();
  const { tokens } = useAuth();

  const [rows, setRows] = useState<FriendRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!tokens?.accessToken) return;
    streaksApi
      .getFriendsLeaderboard(tokens.accessToken)
      .then((data: any) => {
        if (cancelled) return;
        setRows(
          (Array.isArray(data) ? data : []).map((r: any) => ({
            userId: String(r.userId),
            currentStreak: r.currentStreak ?? 0,
            isMe: !!r.isMe,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  if (error) return null;
  if (!rows) return null; // still loading — keep layout quiet

  const friendCount = rows.filter((r) => !r.isMe).length;

  if (friendCount === 0) {
    // No friends yet → invite-first state.
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={onPressInvite}
      >
        <LinearGradient
          colors={['rgba(202,253,0,0.10)', 'rgba(202,253,0,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.iconCircle}>
          <Ionicons name="person-add" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titleStrong}>
            {t('friendsRank.inviteTitle', {
              defaultValue: 'Invite friends, earn coins',
            })}
          </Text>
          <Text style={styles.bodyMuted}>
            {t('friendsRank.inviteBody', {
              defaultValue: '+50 coins for every friend who joins and picks.',
            })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
    );
  }

  // At least one friend → rank state. The board is already sorted by
  // currentStreak desc on the server, so the user's rank is just
  // their index + 1.
  const myIdx = rows.findIndex((r) => r.isMe);
  const myRank = myIdx === -1 ? rows.length : myIdx + 1;
  const total = rows.length;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPressLeaderboard}
    >
      <LinearGradient
        colors={['rgba(64,156,255,0.12)', 'rgba(64,156,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.iconCircle, { backgroundColor: 'rgba(64,156,255,0.18)' }]}>
        <Ionicons name="people" size={20} color={colors.info ?? '#409CFF'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.titleStrong}>
          {t('friendsRank.rankTitle', {
            rank: myRank,
            total,
            defaultValue: "You're #{{rank}} of {{total}}",
          })}
        </Text>
        <Text style={styles.bodyMuted}>
          {myRank === 1
            ? t('friendsRank.rankLead', {
                defaultValue: 'You\'re leading your friends. Keep the streak alive.',
              })
            : t('friendsRank.rankBehind', {
                defaultValue: 'Tap to see who\'s above you.',
              })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(202,253,0,0.18)',
  },
  titleStrong: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  bodyMuted: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    marginTop: 2,
  },
});
