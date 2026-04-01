import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchasesContext';
import { sportsApi } from '../api/sports';
import type {
  SearchResults,
  SearchTeamResult,
  SearchLeagueResult,
  SearchMatchResult,
} from '../api/sports';
import type { RootStackParamList } from '../navigation/types';

const RECENT_KEY = '@kinetic_recent_searches';
const MAX_RECENT = 10;
const DEBOUNCE_MS = 350;

type SectionItem =
  | { type: 'team'; data: SearchTeamResult }
  | { type: 'league'; data: SearchLeagueResult }
  | { type: 'match'; data: SearchMatchResult }
  | { type: 'recent'; data: string };

function Logo({ uri, size = 28 }: { uri?: string; size?: number }) {
  if (uri) {
    return (
      <ExpoImage
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 4 }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: colors.surfaceContainerHighest,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="football-outline" size={size * 0.5} color={colors.onSurfaceVariant} />
    </View>
  );
}

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { tokens } = useAuth();
  const { isProMember } = usePurchases();
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches on mount + auto-focus
  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((val) => {
      if (val) setRecentSearches(JSON.parse(val));
    });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const saveRecent = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeRecent = useCallback(async (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const doSearch = useCallback(
    async (q: string) => {
      if (!tokens?.accessToken || q.trim().length < 2) {
        setResults(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await sportsApi.search(tokens.accessToken, q.trim());
        setResults(res);
      } catch {
        setResults({ teams: [], leagues: [], matches: [] });
      } finally {
        setLoading(false);
      }
    },
    [tokens?.accessToken],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.trim().length < 2) {
        setResults(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(() => doSearch(text), DEBOUNCE_MS);
    },
    [doSearch],
  );

  const handleSubmit = useCallback(() => {
    if (query.trim().length >= 2) {
      saveRecent(query);
      doSearch(query);
    }
    Keyboard.dismiss();
  }, [query, saveRecent, doSearch]);

  const handleRecentTap = useCallback(
    (term: string) => {
      setQuery(term);
      saveRecent(term);
      doSearch(term);
    },
    [saveRecent, doSearch],
  );

  const handleTeamPress = (team: SearchTeamResult) => {
    saveRecent(team.name);
    if (!isProMember && team.leagueTier === 'premium') {
      navigation.navigate('Paywall', { trigger: 'sport_locked', sportName: team.name });
      return;
    }
    // Navigate to league detail to see team's games
    if (team.leagueApiId) {
      navigation.navigate('Main', {
        screen: 'Home',
        params: { screen: 'LeagueDetail', params: { leagueApiId: team.leagueApiId, sport: 'football' } },
      } as any);
    }
  };

  const handleLeaguePress = (league: SearchLeagueResult) => {
    saveRecent(league.name);
    if (!isProMember && league.tier === 'premium') {
      navigation.navigate('Paywall', { trigger: 'premium_league', sportName: league.name });
      return;
    }
    navigation.navigate('Main', {
      screen: 'Home',
      params: { screen: 'LeagueDetail', params: { leagueApiId: league.apiId, sport: 'football' } },
    } as any);
  };

  const handleMatchPress = (match: SearchMatchResult) => {
    saveRecent(`${match.homeTeam.name} vs ${match.awayTeam.name}`);
    if (!isProMember && match.leagueTier === 'premium') {
      navigation.navigate('Paywall', { trigger: 'premium_league', sportName: match.leagueName });
      return;
    }
    navigation.navigate('Main', {
      screen: 'Home',
      params: { screen: 'MatchPrediction', params: { fixtureApiId: match.apiId, sport: 'football' } },
    } as any);
  };

  // Build sections
  const sections: { title: string; data: SectionItem[] }[] = [];

  if (results) {
    if (results.teams.length > 0) {
      sections.push({
        title: t('search.teams'),
        data: results.teams.map((teamItem) => ({ type: 'team' as const, data: teamItem })),
      });
    }
    if (results.leagues.length > 0) {
      sections.push({
        title: t('search.leagues'),
        data: results.leagues.map((l) => ({ type: 'league' as const, data: l })),
      });
    }
    if (results.matches.length > 0) {
      sections.push({
        title: t('search.upcomingMatches'),
        data: results.matches.map((m) => ({ type: 'match' as const, data: m })),
      });
    }
  } else if (query.length < 2 && recentSearches.length > 0) {
    sections.push({
      title: t('search.recentSearches'),
      data: recentSearches.map((s) => ({ type: 'recent' as const, data: s })),
    });
  }

  const hasNoResults = results && results.teams.length === 0 && results.leagues.length === 0 && results.matches.length === 0;

  const renderItem = ({ item }: { item: SectionItem }) => {
    switch (item.type) {
      case 'team': {
        const team = item.data;
        const premium = !isProMember && team.leagueTier === 'premium';
        return (
          <TouchableOpacity style={styles.resultRow} onPress={() => handleTeamPress(team)} activeOpacity={0.7}>
            <Logo uri={team.logo} size={32} />
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle} numberOfLines={1}>{team.name}</Text>
              {team.countryName ? <Text style={styles.resultSub}>{team.countryName}</Text> : null}
            </View>
            {premium && <Ionicons name="lock-closed" size={14} color={colors.primary} />}
            <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        );
      }
      case 'league': {
        const league = item.data;
        const premium = !isProMember && league.tier === 'premium';
        return (
          <TouchableOpacity style={styles.resultRow} onPress={() => handleLeaguePress(league)} activeOpacity={0.7}>
            <Logo uri={league.logo} size={32} />
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle} numberOfLines={1}>{league.name}</Text>
              {league.countryName ? (
                <Text style={styles.resultSub}>
                  {league.countryName} {league.type === 'Cup' ? '• Cup' : ''}
                </Text>
              ) : null}
            </View>
            {premium && <Ionicons name="lock-closed" size={14} color={colors.primary} />}
            <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        );
      }
      case 'match': {
        const match = item.data;
        const gameDate = new Date(match.date);
        const timeStr = gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = gameDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const premium = !isProMember && match.leagueTier === 'premium';
        return (
          <TouchableOpacity style={styles.matchRow} onPress={() => handleMatchPress(match)} activeOpacity={0.7}>
            <View style={styles.matchTeams}>
              <View style={styles.matchTeamLine}>
                <Logo uri={match.homeTeam.logo} size={22} />
                <Text style={styles.matchTeamName} numberOfLines={1}>{match.homeTeam.name}</Text>
              </View>
              <View style={styles.matchTeamLine}>
                <Logo uri={match.awayTeam.logo} size={22} />
                <Text style={styles.matchTeamName} numberOfLines={1}>{match.awayTeam.name}</Text>
              </View>
            </View>
            <View style={styles.matchMeta}>
              <Text style={styles.matchTime}>{timeStr}</Text>
              <Text style={styles.matchDate}>{dateStr}</Text>
            </View>
            {premium ? (
              <Ionicons name="lock-closed" size={14} color={colors.primary} />
            ) : (
              <View style={styles.predictChip}>
                <Text style={styles.predictChipText}>PREDICT</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }
      case 'recent':
        return (
          <TouchableOpacity
            style={styles.recentRow}
            onPress={() => handleRecentTap(item.data)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.recentText} numberOfLines={1}>{item.data}</Text>
            <TouchableOpacity onPress={() => removeRecent(item.data)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
    }
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={colors.onSurfaceVariant} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            value={query}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{t('search.cancel')}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {query.length > 0 && query.length < 2 && !results && (
        <View style={styles.hintWrap}>
          <Text style={styles.hintText}>{t('search.keepTyping')}</Text>
        </View>
      )}

      {hasNoResults && (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={40} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>{t('search.noResults', { query })}</Text>
          <Text style={styles.emptySub}>{t('search.tryDifferent')}</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => {
          if (item.type === 'recent') return `recent-${item.data}`;
          if (item.type === 'team') return `team-${item.data.apiId}`;
          if (item.type === 'league') return `league-${item.data.apiId}`;
          if (item.type === 'match') return `match-${item.data.apiId}`;
          return String(index);
        }}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.onSurface,
    height: 44,
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.primary,
  },

  // Section headers
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Result rows
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  resultSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  // Match rows
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  matchTeams: {
    flex: 1,
    gap: 4,
  },
  matchTeamLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchTeamName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
  },
  matchMeta: {
    alignItems: 'center',
    gap: 2,
  },
  matchTime: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  matchDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  predictChip: {
    backgroundColor: 'rgba(202,253,0,0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  predictChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.8,
  },

  // Recent searches
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  recentText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
  },

  // States
  hintWrap: {
    alignItems: 'center',
    paddingTop: 48,
  },
  hintText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  listContent: {
    paddingBottom: 40,
  },
});
