import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import {
  footballLeaguesApi,
  FootballLeague,
  REGION_LABELS,
  REGION_ORDER,
} from '../api/footballLeagues';
import { sportsApi, SPORT_TABS, SportLeague } from '../api/sports';
import type { SportKey } from '../api/sports';

const MIN_LEAGUES = 1;
const MAX_LEAGUES = 30;

interface Props {
  onComplete: () => void;
  selectedSports?: string[];
}

// Unified league shape used by the list
interface UnifiedLeague {
  apiId: number;
  name: string;
  logo: string;
  countryName: string;
  countryFlag?: string;
  tier?: 'free' | 'premium';
  isFeatured: boolean;
  priority: number;
  region?: string;
  sport: string;
}

function toUnified(league: FootballLeague): UnifiedLeague {
  return {
    apiId: league.apiId,
    name: league.name,
    logo: league.logo,
    countryName: league.countryName,
    countryFlag: league.countryFlag,
    tier: league.tier,
    isFeatured: league.isFeatured,
    priority: league.priority ?? 99,
    region: league.region,
    sport: 'football',
  };
}

function sportLeagueToUnified(league: SportLeague, sport: string): UnifiedLeague {
  return {
    apiId: league.apiId,
    name: league.name,
    logo: league.logo,
    countryName: league.countryName || '',
    countryFlag: league.countryFlag,
    tier: league.tier,
    isFeatured: league.isFeatured ?? true,
    priority: 99,
    sport,
  };
}

// ─── Sport Tabs ──────────────────────────────────────────

const SPORT_COLORS: Record<string, string> = {
  football: '#5BEF90',
  basketball: '#FF7351',
  hockey: '#4FC3F7',
  'american-football': '#A78BFA',
  baseball: '#FBBF24',
  'formula-1': '#FF4444',
};

function SportTabBar({
  sports,
  active,
  onSelect,
  leagueCounts,
}: {
  sports: string[];
  active: string;
  onSelect: (s: string) => void;
  leagueCounts: Record<string, number>;
}) {
  if (sports.length <= 1) return null;

  return (
    <View style={styles.sportTabRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sportTabScroll}
      >
        {sports.map((s) => {
          const isActive = active === s;
          const meta = SPORT_TABS.find((t) => t.key === s);
          const color = SPORT_COLORS[s] || colors.primary;
          const count = leagueCounts[s];

          return (
            <TouchableOpacity
              key={s}
              style={[styles.sportTab, isActive && { borderBottomColor: color }]}
              onPress={() => onSelect(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sportTabText, isActive && { color: colors.onSurface, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                {meta?.name || s}
              </Text>
              {count !== undefined && count > 0 && (
                <Text style={[styles.sportTabCount, isActive && { color }]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Region filter pills (football only) ─────────────────

function RegionPills({
  regions,
  active,
  onSelect,
  regionCounts,
}: {
  regions: string[];
  active: string;
  onSelect: (r: string) => void;
  regionCounts: Record<string, number>;
}) {
  const allRegions = ['all', ...regions];

  return (
    <View style={styles.regionRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionScrollContent}
      >
        {allRegions.map((r) => {
          const isActive = active === r;
          const label = r === 'all' ? 'All' : REGION_LABELS[r] || r;
          const count = r === 'all' ? undefined : regionCounts[r];

          return (
            <TouchableOpacity
              key={r}
              style={[styles.regionPill, isActive && styles.regionPillActive]}
              onPress={() => onSelect(r)}
              activeOpacity={0.7}
            >
              <Text style={[styles.regionPillText, isActive && styles.regionPillTextActive]}>
                {label}
              </Text>
              {count !== undefined && (
                <Text style={[styles.regionPillCount, isActive && styles.regionPillCountActive]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Popular Quick-Picks (football only) ─────────────────

function PopularPicks({
  leagues,
  selected,
  onToggle,
}: {
  leagues: UnifiedLeague[];
  selected: Set<number>;
  onToggle: (id: number) => void;
}) {
  const { t } = useTranslation();
  if (leagues.length === 0) return null;

  return (
    <View style={styles.popularSection}>
      <View style={styles.popularHeader}>
        <Ionicons name="flame" size={16} color="#FF7351" />
        <Text style={styles.popularTitle}>{t('leagueSelection.mostPopular')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.popularRow}
      >
        {leagues.map((league) => {
          const isSel = selected.has(league.apiId);
          return (
            <TouchableOpacity
              key={league.apiId}
              style={[styles.popularCard, isSel && styles.popularCardSelected]}
              onPress={() => onToggle(league.apiId)}
              activeOpacity={0.7}
            >
              {isSel && (
                <View style={styles.popularCheck}>
                  <Ionicons name="checkmark" size={10} color="#0B0E11" />
                </View>
              )}
              <ExpoImage
                source={{ uri: league.logo }}
                style={styles.popularLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <Text style={styles.popularName} numberOfLines={2}>
                {league.name}
              </Text>
              <View style={styles.popularCountryRow}>
                {league.countryFlag ? (
                  <ExpoImage
                    source={{ uri: league.countryFlag }}
                    style={styles.popularFlagImg}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : null}
                <Text style={styles.popularCountry} numberOfLines={1}>
                  {league.countryName}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── League card (memoized) ──────────────────────────────

const LeagueCard = memo(function LeagueCard({
  league,
  selected,
  onToggle,
}: {
  league: UnifiedLeague;
  selected: boolean;
  onToggle: (apiId: number) => void;
}) {
  const handlePress = useCallback(() => onToggle(league.apiId), [onToggle, league.apiId]);

  return (
    <TouchableOpacity
      style={[styles.leagueCard, selected && styles.leagueCardSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <ExpoImage
        source={{ uri: league.logo }}
        style={styles.leagueLogo}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <View style={styles.leagueInfo}>
        <Text style={styles.leagueName} numberOfLines={1}>
          {league.name}
        </Text>
        <View style={styles.leagueMeta}>
          {league.countryFlag ? (
            <ExpoImage
              source={{ uri: league.countryFlag }}
              style={styles.leagueFlagImg}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : null}
          <Text style={styles.leagueCountry} numberOfLines={1}>
            {league.countryName}
          </Text>
          {league.tier === 'free' && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>
      </View>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={14} color="#0B0E11" />}
      </View>
    </TouchableOpacity>
  );
});

// ─── Section Header ──────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionCount}>{count} {t('leagueSelection.leagues')}</Text>
    </View>
  );
}

// ─── FlatList helpers ────────────────────────────────────

const ITEM_HEIGHT = 62;
const keyExtractor = (item: UnifiedLeague) => `${item.sport}-${item.apiId}`;
const getItemLayout = (_data: any, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

// ─── Main Screen ─────────────────────────────────────────

export function LeagueSelectionScreen({ onComplete, selectedSports }: Props) {
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const sports = useMemo(
    () => (selectedSports && selectedSports.length > 0 ? selectedSports : ['football']),
    [selectedSports],
  );

  const [activeSport, setActiveSport] = useState(sports[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchFocused, setSearchFocused] = useState(false);

  // Cache per sport: { football: UnifiedLeague[], basketball: UnifiedLeague[], ... }
  const [leagueCache, setLeagueCache] = useState<Record<string, UnifiedLeague[]>>({});
  // Football-specific region data
  const [footballByRegion, setFootballByRegion] = useState<Record<string, UnifiedLeague[]>>({});

  // Fetch leagues for a sport
  const fetchSportLeagues = useCallback(
    async (sport: string) => {
      if (!tokens?.accessToken) return;
      if (leagueCache[sport]) return; // already cached

      try {
        if (sport === 'football') {
          const data = await footballLeaguesApi.getGlobalLeagues(tokens.accessToken);
          const unified = data.leagues.map(toUnified);
          const regionMap: Record<string, UnifiedLeague[]> = {};
          for (const [region, leagues] of Object.entries(data.byRegion)) {
            regionMap[region] = leagues.map(toUnified);
          }
          setFootballByRegion(regionMap);
          setLeagueCache((prev) => ({ ...prev, football: unified }));
        } else {
          const leagues = await sportsApi.getLeagues(tokens.accessToken, sport as SportKey);
          const unified = leagues.map((l) => sportLeagueToUnified(l, sport));
          setLeagueCache((prev) => ({ ...prev, [sport]: unified }));
        }
      } catch {
        // Set empty array so we don't retry endlessly
        setLeagueCache((prev) => ({ ...prev, [sport]: [] }));
      }
    },
    [tokens?.accessToken, leagueCache],
  );

  // Fetch first sport on mount, and prefetch others
  useEffect(() => {
    if (!tokens?.accessToken) return;
    let cancelled = false;

    (async () => {
      await fetchSportLeagues(sports[0]);
      if (cancelled) return;
      setLoading(false);

      // Prefetch remaining sports in background
      for (let i = 1; i < sports.length; i++) {
        if (cancelled) break;
        await fetchSportLeagues(sports[i]);
      }
    })();

    return () => { cancelled = true; };
  }, [tokens?.accessToken, sports[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  // When switching sport tab, fetch if not cached
  const handleSportChange = useCallback(
    (sport: string) => {
      setActiveSport(sport);
      setSearch('');
      setActiveRegion('all');
      fetchSportLeagues(sport);
    },
    [fetchSportLeagues],
  );

  // Current sport data
  const currentLeagues = leagueCache[activeSport] || [];
  const isFootball = activeSport === 'football';

  const availableRegions = useMemo(() => {
    if (!isFootball) return [];
    const regions = Object.keys(footballByRegion);
    return REGION_ORDER.filter((r) => regions.includes(r));
  }, [isFootball, footballByRegion]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [r, leagues] of Object.entries(footballByRegion)) {
      counts[r] = leagues.length;
    }
    return counts;
  }, [footballByRegion]);

  const leagueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [sport, leagues] of Object.entries(leagueCache)) {
      counts[sport] = leagues.length;
    }
    return counts;
  }, [leagueCache]);

  const popularLeagues = useMemo(
    () => (isFootball ? currentLeagues.filter((l) => l.isFeatured).slice(0, 8) : []),
    [isFootball, currentLeagues],
  );

  const filtered = useMemo(() => {
    let list: UnifiedLeague[];

    if (isFootball && activeRegion !== 'all') {
      list = footballByRegion[activeRegion] || [];
    } else {
      list = currentLeagues;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.countryName.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });
  }, [currentLeagues, footballByRegion, isFootball, activeRegion, search]);

  const toggleLeague = useCallback((apiId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(apiId)) {
        next.delete(apiId);
      } else if (next.size < MAX_LEAGUES) {
        next.add(apiId);
      }
      return next;
    });
  }, []);

  const handleContinue = useCallback(async () => {
    if (!tokens?.accessToken || selected.size < MIN_LEAGUES) return;
    setSaving(true);
    try {
      await footballLeaguesApi.setFavoriteLeagues(
        tokens.accessToken,
        Array.from(selected),
      );
      onComplete();
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  }, [tokens?.accessToken, selected, onComplete]);

  const canContinue = selected.size >= MIN_LEAGUES;
  const sportLoading = !leagueCache[activeSport];

  const regionLabel = isFootball
    ? activeRegion === 'all'
      ? t('leagueSelection.allLeagues')
      : REGION_LABELS[activeRegion] || activeRegion
    : t('leagueSelection.featuredLeagues');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('leagueSelection.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepLabel}>{t('leagueSelection.step')}</Text>
        <Text style={styles.title}>{t('leagueSelection.title')}</Text>
        <Text style={styles.subtitle}>{t('leagueSelection.subtitle')}</Text>
      </View>

      {/* Sport tabs — only if multiple sports selected */}
      <SportTabBar
        sports={sports}
        active={activeSport}
        onSelect={handleSportChange}
        leagueCounts={leagueCounts}
      />

      {/* Search */}
      <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
        <Ionicons
          name="search"
          size={18}
          color={searchFocused ? colors.primary : colors.onSurfaceVariant}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={t('leagueSelection.searchPlaceholder')}
          placeholderTextColor={colors.onSurfaceVariant}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Region filters — football only */}
      {isFootball && (
        <RegionPills
          regions={availableRegions}
          active={activeRegion}
          onSelect={setActiveRegion}
          regionCounts={regionCounts}
        />
      )}

      {/* League list */}
      {sportLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => (
            <LeagueCard
              league={item}
              selected={selected.has(item.apiId)}
              onToggle={toggleLeague}
            />
          )}
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          getItemLayout={getItemLayout}
          ListHeaderComponent={
            <>
              {isFootball && activeRegion === 'all' && !search.trim() && (
                <PopularPicks
                  leagues={popularLeagues}
                  selected={selected}
                  onToggle={toggleLeague}
                />
              )}
              <SectionLabel label={regionLabel} count={filtered.length} />
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>{t('leagueSelection.noLeagues')}</Text>
              <Text style={styles.emptyHint}>{t('leagueSelection.noLeaguesHint')}</Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}

      {/* Floating CTA */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaSummary}>
          {selected.size > 0 ? (
            <Text style={styles.ctaSummaryText}>
              {selected.size !== 1
                ? t('leagueSelection.leaguesSelectedPlural', { count: selected.size })
                : t('leagueSelection.leaguesSelected', { count: selected.size })}
            </Text>
          ) : (
            <Text style={styles.ctaSummaryHint}>{t('leagueSelection.pickAtLeast', { min: MIN_LEAGUES })}</Text>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={!canContinue || saving}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={
              canContinue
                ? ['#E8FF8A', '#CAFD00']
                : ['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.04)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#4A5E00" />
            ) : (
              <>
                <Text style={[styles.ctaText, canContinue && styles.ctaTextActive]}>
                  {canContinue ? t('leagueSelection.letsGo') : t('leagueSelection.selectLeagues')}
                </Text>
                {canContinue && (
                  <Ionicons name="arrow-forward" size={18} color="#4A5E00" />
                )}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },

  // ─ Header
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 10,
    gap: 4,
  },
  stepLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // ─ Sport tabs
  sportTabRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  sportTabScroll: {
    paddingHorizontal: 16,
    gap: 4,
  },
  sportTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sportTabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  sportTabCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },

  // ─ Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: 16,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: 'rgba(202,253,0,0.3)',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurface,
    padding: 0,
  },

  // ─ Region pills (football only)
  regionRow: {
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  regionScrollContent: {
    paddingHorizontal: 16,
    gap: 2,
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  regionPillActive: {
    borderBottomColor: colors.primary,
  },
  regionPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  regionPillTextActive: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurface,
  },
  regionPillCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },
  regionPillCountActive: {
    color: colors.primary,
  },

  // ─ Popular quick-picks
  popularSection: {
    marginBottom: 20,
  },
  popularHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  popularTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
  },
  popularRow: {
    gap: 10,
  },
  popularCard: {
    width: 100,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  popularCardSelected: {
    backgroundColor: 'rgba(202,253,0,0.08)',
    borderColor: colors.primary,
  },
  popularCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularLogo: {
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  popularName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 4,
  },
  popularCountryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularFlagImg: {
    width: 14,
    height: 10,
    borderRadius: 1,
  },
  popularCountry: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },

  // ─ Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  sectionCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  // ─ League list
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, gap: 6 },

  leagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.sm,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leagueCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(202,253,0,0.06)',
  },
  leagueLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  leagueInfo: { flex: 1, gap: 3 },
  leagueName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  leagueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  leagueFlagImg: {
    width: 18,
    height: 13,
    borderRadius: 2,
  },
  leagueCountry: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  freeBadge: {
    backgroundColor: 'rgba(91,239,144,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  freeBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: '#5BEF90',
    letterSpacing: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  // ─ Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 6,
  },
  emptyText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: colors.onSurface,
  },
  emptyHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },

  // ─ CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 10,
    backgroundColor: 'rgba(11,14,17,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  ctaSummary: {
    alignItems: 'center',
    marginBottom: 8,
  },
  ctaSummaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  ctaSummaryCount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
  },
  ctaSummaryHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  ctaWrap: { borderRadius: 14, overflow: 'hidden' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
  },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: 'rgba(202,253,0,0.3)',
    letterSpacing: 1.2,
  },
  ctaTextActive: { color: '#3A4A00' },
});
