import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useCoins } from '../contexts/CoinContext';
import { useAuth } from '../contexts/AuthContext';
import { coinsApi } from '../api/coins';
import type { CoinTransaction } from '../api/coins';
import type { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

export function WalletRewardsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tokens } = useAuth();
  const {
    balance,
    lockedBalance,
    available,
    totalEarned,
    totalSpent,
    isLoading: balanceLoading,
    refreshBalance,
  } = useCoins();

  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Show first-use disclaimer modal
  useEffect(() => {
    AsyncStorage.getItem('wallet_disclaimer_seen').then((v) => {
      if (!v) setShowDisclaimer(true);
    });
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await coinsApi.getTransactions(tokens.accessToken, 1, 10);
      setTransactions(res.transactions);
    } catch {
      // Failed silently
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    setTxLoading(true);
    fetchTransactions().finally(() => setTxLoading(false));
  }, [fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshBalance(), fetchTransactions()]);
    setRefreshing(false);
  }, [refreshBalance, fetchTransactions]);

  const txTypeDisplay = (type: string) => {
    switch (type) {
      case 'purchase': return { label: 'Coin Purchase', icon: 'arrow-down-left' as const, color: colors.primary };
      case 'subscription_grant': return { label: 'Pro Bonus', icon: 'gift' as const, color: '#FC5B00' };
      case 'league_entry': return { label: 'League Entry', icon: 'arrow-up-right' as const, color: '#FF4444' };
      case 'league_winnings': return { label: 'League Rewards', icon: 'award' as const, color: '#FFD700' };
      case 'giftcard_redemption': return { label: 'Gift Card', icon: 'shopping-bag' as const, color: '#FF4444' };
      case 'refund': return { label: 'Refund', icon: 'rotate-ccw' as const, color: colors.info };
      case 'welcome_bonus': return { label: 'Welcome Bonus', icon: 'star' as const, color: colors.primary };
      default: return { label: type, icon: 'circle' as const, color: colors.onSurfaceDim };
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WALLET</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <LinearGradient
          colors={['rgba(202,253,0,0.12)', 'rgba(202,253,0,0.02)']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>COIN BALANCE</Text>
          <View style={styles.balanceMainRow}>
            <MaterialCommunityIcons name="circle-multiple" size={28} color={colors.primary} />
            <Text style={styles.balanceValue}>
              {balanceLoading ? '...' : balance.toLocaleString()}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Ionicons name="lock-closed" size={12} color={colors.warning} />
              <Text style={styles.balanceStatText}>
                {lockedBalance.toLocaleString()} locked
              </Text>
            </View>
            <View style={styles.balanceStat}>
              <Ionicons name="wallet" size={12} color={colors.primary} />
              <Text style={styles.balanceStatText}>
                {available.toLocaleString()} available
              </Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Ionicons name="trending-up" size={12} color={colors.secondary} />
              <Text style={styles.balanceStatText}>
                {totalEarned.toLocaleString()} earned
              </Text>
            </View>
            <View style={styles.balanceStat}>
              <Ionicons name="trending-down" size={12} color={colors.error} />
              <Text style={styles.balanceStatText}>
                {totalSpent.toLocaleString()} spent
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CoinStore')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(202,253,0,0.1)' }]}>
              <Feather name="plus-circle" size={22} color={colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Buy Coins</Text>
            <Text style={styles.actionDesc}>Get coins via in-app purchase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('GiftcardRedeem')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(252,91,0,0.1)' }]}>
              <Feather name="gift" size={22} color="#FC5B00" />
            </View>
            <Text style={styles.actionTitle}>Gift Cards</Text>
            <Text style={styles.actionDesc}>Redeem coins for gift cards</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { paddingHorizontal: spacing['2xl'], marginTop: spacing['3xl'] }]}>
          RECENT ACTIVITY
        </Text>

        {txLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyTx}>
            <Text style={styles.emptyTxText}>
              No transactions yet. Buy coins to get started!
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx) => {
              const display = txTypeDisplay(tx.type);
              const isNeg = tx.amount < 0;
              return (
                <View key={tx._id} style={styles.txRow}>
                  <View
                    style={[
                      styles.txIcon,
                      { backgroundColor: `${display.color}1A` },
                    ]}
                  >
                    <Feather name={display.icon} size={16} color={display.color} />
                  </View>
                  <View style={styles.txContent}>
                    <Text style={styles.txLabel} numberOfLines={1}>
                      {tx.description || display.label}
                    </Text>
                    <Text style={styles.txTime}>
                      {new Date(tx.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txPts,
                      { color: isNeg ? colors.error : colors.primary },
                    ]}
                  >
                    {isNeg ? '' : '+'}{tx.amount}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.howSection}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <View style={styles.howCard}>
            <HowStep
              step="1"
              title="Buy or Earn Coins"
              desc="Purchase coin packs or earn 30/month with Pro"
            />
            <HowStep
              step="2"
              title="Join Leagues"
              desc="Use coins to enter prediction leagues and compete"
            />
            <HowStep
              step="3"
              title="Win Prizes"
              desc="Top predictors win the prize pool (minus 10% fee)"
            />
            <HowStep
              step="4"
              title="Redeem Rewards"
              desc="Exchange coins for real gift cards"
              isLast
            />
          </View>
        </View>

        {/* Compliance footer */}
        <Text style={styles.disclaimer}>
          Kinetic is a skill-based prediction game for entertainment purposes.
          Coins are virtual credits with no cash value. Not a gambling service.
        </Text>
      </ScrollView>

      {/* First-use disclaimer modal */}
      <Modal
        visible={showDisclaimer}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons
              name="circle-multiple"
              size={36}
              color={colors.primary}
              style={{ alignSelf: 'center', marginBottom: 12 }}
            />
            <Text style={styles.modalTitle}>Welcome to Kinetic Wallet</Text>
            <Text style={styles.modalBody}>
              Coins are virtual credits used within Kinetic for:{'\n\n'}
              {'\u2022'} Entering prediction leagues (skill-based competitions){'\n'}
              {'\u2022'} Redeeming promotional gift card rewards{'\n\n'}
              Coins have no real-world cash value and cannot be transferred
              to other users or converted to currency.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowDisclaimer(false);
                AsyncStorage.setItem('wallet_disclaimer_seen', '1');
              }}
            >
              <Text style={styles.modalBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HowStep({ step, title, desc, isLast = false }: { step: string; title: string; desc: string; isLast?: boolean }) {
  return (
    <View style={[howStyles.row, !isLast && howStyles.rowBorder]}>
      <View style={howStyles.stepCircle}>
        <Text style={howStyles.stepNum}>{step}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={howStyles.stepTitle}>{title}</Text>
        <Text style={howStyles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const howStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(202,253,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.primary,
  },
  stepTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  stepDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  scroll: { flex: 1 },

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },

  balanceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing['2xl'],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
  },
  balanceLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
  },
  balanceMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  balanceValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 44,
    color: colors.primary,
    letterSpacing: -1,
  },
  balanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  balanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceStatText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing['2xl'],
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    alignItems: 'center',
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'center',
  },
  actionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    marginTop: 2,
  },

  emptyTx: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
  emptyTxText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },

  txList: {
    marginHorizontal: spacing.lg,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txContent: { flex: 1 },
  txLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  txTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
  txPts: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    marginLeft: spacing.sm,
  },

  howSection: {
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  howCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },

  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    marginTop: spacing['3xl'],
    marginHorizontal: spacing['2xl'],
    lineHeight: 15,
    opacity: 0.7,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#000',
  },
});
