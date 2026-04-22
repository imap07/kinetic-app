import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LeaguesStackParamList } from '../navigation/types';
import { leaguesApi } from '../api/leagues';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing } from '../theme';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<LeaguesStackParamList, 'JoinLeague'>;

export function JoinLeagueScreen({ route, navigation }: Props) {
  const { inviteCode } = route.params;
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const token = tokens?.accessToken;
    if (!token) {
      navigation.replace('LeaguesHome');
      return;
    }

    leaguesApi
      .getByInviteCode(token, inviteCode)
      .then((league) => {
        navigation.replace('CoinLeagueDetail', { leagueId: league._id });
      })
      .catch(() => {
        navigation.replace('LeaguesHome');
      });
  }, [inviteCode, tokens, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{t('leagues.joiningLeague', 'Opening league...')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  text: {
    color: colors.secondary,
    fontSize: 14,
  },
});
