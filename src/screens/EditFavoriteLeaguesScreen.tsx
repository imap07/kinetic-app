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
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
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

const MAX_LEAGUES = 30;

// Unified league shape
interface UnifiedLeague {
  apiId: number;
  name: string;
  logo: string;
  countryName: string;
  countryFlag?: string;
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
    isFeatured: league.isFeatured ?? true,
    priority: 99,
    sport,
  };
}

// ─── Sport colors ──────────────────────────────────────────

const SPORT_COLORS: Record<string, string> = {
  football: '#5BEF90',
  basketball: '#FF7351',
  hockey: '#4FC3F7',
  'american-football': '#A78BFA',
  baseball: '#FBBF24',
  'formula-1': '#FF4444',
};

// ─── Sport Tabs ──────────────────────────────────────────

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
  const { t } = useTranslation();
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
              <Text
                style={[
                  styles.sportTabText,
                  isActive && { color: colors.onSurface, fontFamily: 'SpaceGrotesk_700Bold' },
                ]}
              >
                {t(`sportNames.${s}`, { defaultValue: meta?.name || s })}
              </Text>
              {count !== undefined && count > 0 && (
                <Text style={[styles.sportTabCount, isActive && { color }]}>{count}</Text>
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
        </View>
      </View>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={14} color="#0B0E11" />}
      </View>
    </TouchableOpacity>
  );
});

// ─── FlatList helpers ────────────────────────────────────

const ITEM_HEIGHT = 62;
const keyExtractor = (item: UnifiedLeague) => `${item.sport}-${item.apiId}`;
const getItemLayout = (_data: any, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

// ─── Main Screen ─────────────────────────────────────────

export function EditFavoriteLeaguesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens, user, refreshProfile } = useAuth();
  const { t } = useTranslation();

  const sports = useMemo(
    () =>
      user?.favoriteSports && user.favoriteSports.length > 0
        ? user.favoriteSports
        : ['football'],
    [user?.favoriteSports],
  );

  const [activeSport, setActiveSport] = useState(sports[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('all');
  const [searchFocused, setSearchFocused] = useState(false);

  // Pre-populate with user's current favorite leagues
  const [selected, setSelected] = useState<Set<number>>(() => {
    const ids = new Set<number>();
    if (user?.favoriteLeagues) {
      for (const league of user.favoriteLeagues) {
        ids.add(league.leagueApiId);
      }
    }
    return ids;
  });

  // Cache per sport
  const [leagueCache, setLeagueCache] = useState<Record<string, UnifiedLeague[]>>({});
  const [footballByRegion, setFootballByRegion] = useState<Record<string, UnifiedLeague[]>>({});

  const fetchSportLeagues = useCallback(
    async (sport: string) => {
      if (!tokens?.accessToken) return;
      if (leagueCache[sport]) return;

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
        setLeagueCache((prev) => ({ ...prev, [sport]: [] }));
      }
    },
    [tokens?.accessToken, leagueCache],
  );

  useEffect(() => {
    if (!tokens?.accessToken) return;
    let cancelled = false;

    (async () => {
      await fetchSportLeagues(sports[0]);
      if (cancelled) return;
      setLoading(false);

      for (let i = 1; i < sports.length; i++) {
        if (cancelled) break;
        await fetchSportLeagues(sports[i]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken, sports[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSportChange = useCallback(
    (sport: string) => {
      setActiveSport(sport);
      setSearch('');
      setActiveRegion('all');
      fetchSportLeagues(sport);
    },
    [fetchSportLeagues],
  );

  const currentLeagues = leagueCache[activeSport] || [];
  const isFootball = activeSport === 'football';
  const isF1 = activeSport === 'formula-1';

  /**
   * Flat map across every loaded sport so the "Your favorites" strip can
   * resolve a chip from an id regardless of which sport tab the league
   * lives in. Football specifically: `leagueCache.football` only holds
   * featured leagues, so we also merge in `footballByRegion` (all
   * regions flattened) to catch any user-selected id that isn't in the
   * featured set.
   */
  const allLoadedLeaguesById = useMemo(() => {
    const map = new Map<number, UnifiedLeague>();
    for (const leagues of Object.values(leagueCache)) {
      for (const lg of leagues) if (!map.has(lg.apiId)) map.set(lg.apiId, lg);
    }
    for (const leagues of Object.values(footballByRegion)) {
      for (const lg of leagues) if (!map.has(lg.apiId)) map.set(lg.apiId, lg);
    }
    return map;
  }, [leagueCache, footballByRegion]);

  const selectedChips = useMemo(() => {
    // Order is stable: follow the user's current `favoriteLeagues` order
    // so adding/removing doesn't shuffle what the user sees.
    const base = user?.favoriteLeagues?.map((l) => l.leagueApiId) ?? [];
    const extras = Array.from(selected).filter((id) => !base.includes(id));
    const order = [...base.filter((id) => selected.has(id)), ...extras];
    return order.map((id) => ({
      apiId: id,
      meta: allLoadedLeaguesById.get(id),
    }));
  }, [selected, user?.favoriteLeagues, allLoadedLeaguesById]);

  // F1: check if user is following the full season (any F1 competition selected)
  const f1Following = useMemo(() => {
    if (!isF1) return false;
    return currentLeagues.some((l) => selected.has(l.apiId));
  }, [isF1, currentLeagues, selected]);

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
      // F1 uses a season toggle, don't show individual GP count
      if (sport === 'formula-1') continue;
      counts[sport] = leagues.length;
    }
    return counts;
  }, [leagueCache]);

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
        (l) => l.name.toLowerCase().includes(q) || l.countryName.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      // Selected first
      const aSel = selected.has(a.apiId) ? 0 : 1;
      const bSel = selected.has(b.apiId) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });
  }, [currentLeagues, footballByRegion, isFootball, activeRegion, search, selected]);

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

  const handleSave = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setSaving(true);
    try {
      await footballLeaguesApi.setFavoriteLeagues(tokens.accessToken, Array.from(selected));
      await refreshProfile();
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('editFavorites.errorLeagues'));
    } finally {
      setSaving(false);
    }
  }, [tokens?.accessToken, selected, navigation, refreshProfile]);

  // Check if something changed
  const originalLeagueIds = useMemo(() => {
    const ids = new Set<number>();
    if (user?.favoriteLeagues) {
      for (const league of user.favoriteLeagues) {
        ids.add(league.leagueApiId);
      }
    }
    return ids;
  }, [user?.favoriteLeagues]);

  const hasChanges =
    selected.size !== originalLeagueIds.size ||
    Array.from(selected).some((id) => !originalLeagueIds.has(id));

  const canSave = hasChanges;
  const sportLoading = !leagueCache[activeSport];

  const regionLabel = isFootball
    ? activeRegion === 'all'
      ? t('editFavorites.allLeagues')
      : REGION_LABELS[activeRegion] || activeRegion
    : t('editFavorites.featuredLeagues');

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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editFavorites.leaguesTitle')}</Text>
        <TouchableOpacity hitSlop={12} onPress={handleSave} disabled={saving || !canSave}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtn, !canSave && { opacity: 0.3 }]}>{t('editFavorites.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sport tabs */}
      <SportTabBar
        sports={sports}
        active={activeSport}
        onSelect={handleSportChange}
        leagueCounts={leagueCounts}
      />

      {/* "Your favorites" quick-remove strip. Cross-sport visibility so a
          user who accidentally kept (or had auto-injected) a league on a
          tab they never open can still see and prune it at a glance. */}
      {selectedChips.length > 0 && (
        <View style={styles.favStrip}>
          <View style={styles.favStripHeader}>
            <Text style={styles.favStripTitle}>
              {t('editFavorites.yourFavoritesTitle', 'Your favorites')}
              {' '}
              <Text style={styles.favStripCount}>({selectedChips.length})</Text>
            </Text>
            <Text style={styles.favStripHint}>
              {t('editFavorites.tapToRemove', 'Tap × to remove')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favStripScroll}
          >
            {selectedChips.map(({ apiId, meta }) => (
              <TouchableOpacity
                key={`fav-${apiId}`}
                style={styles.favChip}
                activeOpacity={0.7}
                onPress={() => toggleLeague(apiId)}
                accessibilityRole="button"
                accessibilityLabel={t('editFavorites.removeFromFavorites', {
                  league: meta?.name || `#${apiId}`,
                  defaultValue: 'Remove {{league}} from favorites',
                })}
              >
                {meta?.logo ? (
                  <ExpoImage
                    source={{ uri: meta.logo }}
                    style={styles.favChipLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="trophy-outline"
                    size={14}
                    color={colors.onSurfaceVariant}
                  />
                )}
                <Text style={styles.favChipText} numberOfLines={1}>
                  {meta?.name || `#${apiId}`}
                </Text>
                <Ionicons name="close" size={14} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search — hidden for F1 (single toggle, no need to search) */}
      {!isF1 && (
        <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
          <Ionicons
            name="search"
            size={18}
            color={searchFocused ? colors.primary : colors.onSurfaceVariant}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t('editFavorites.searchPlaceholder')}
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
      )}

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
      ) : isF1 ? (
        /* ── F1: single season toggle instead of individual GP list ── */
        <View style={styles.f1SeasonContainer}>
          <View style={styles.f1SeasonCard}>
            <View style={styles.f1SeasonHeader}>
              <View style={styles.f1SeasonBadge}>
                <MaterialCommunityIcons name="flag-checkered" size={24} color="#0B0E11" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.f1SeasonTitle}>{t('editFavorites.f1SeasonTitle', { season: new Date().getFullYear() })}</Text>
                <Text style={styles.f1SeasonSub}>{t('editFavorites.f1SeasonSub', { count: currentLeagues.length })}</Text>
              </View>
              <TouchableOpacity
                style={[styles.f1Toggle, f1Following && styles.f1ToggleOn]}
                onPress={() => {
                  const allF1Ids = currentLeagues.map((l) => l.apiId);
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (f1Following) {
                      allF1Ids.forEach((id) => next.delete(id));
                    } else {
                      allF1Ids.forEach((id) => next.add(id));
                    }
                    return next;
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.f1ToggleKnob, f1Following && styles.f1ToggleKnobOn]} />
              </TouchableOpacity>
            </View>

            <View style={styles.f1Divider} />

            <Text style={styles.f1SeasonDesc}>
              {f1Following
                ? t('editFavorites.f1Following')
                : t('editFavorites.f1NotFollowing')}
            </Text>

            {f1Following && (
              <View style={styles.f1GpList}>
                {currentLeagues.slice(0, 6).map((l) => (
                  <View key={l.apiId} style={styles.f1GpChip}>
                    <Text style={styles.f1GpChipText} numberOfLines={1}>{l.name.replace(' Grand Prix', ' GP')}</Text>
                  </View>
                ))}
                {currentLeagues.length > 6 && (
                  <View style={[styles.f1GpChip, styles.f1GpChipMore]}>
                    <Text style={styles.f1GpChipText}>+{currentLeagues.length - 6}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{regionLabel}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {selected.size > 0 && (
                  <TouchableOpacity onPress={() => setSelected(new Set())}>
                    <Text style={styles.clearAllText}>{t('editFavorites.clearAll')}</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.sectionCount}>{filtered.length} {t('editFavorites.leagues')}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>{t('editFavorites.noLeagues')}</Text>
              <Text style={styles.emptyHint}>{t('editFavorites.noLeaguesHint')}</Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}

      {/* Floating CTA */}
      {hasChanges && (
        <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.ctaSummary}>
            <Text style={styles.ctaSummaryText}>
              {selected.size === 0
                ? t('editFavorites.allLeaguesSelected')
                : selected.size !== 1
                ? t('editFavorites.leaguesSelectedPlural', { count: selected.size })
                : t('editFavorites.leaguesSelected', { count: selected.size })}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={!canSave || saving}
            style={styles.ctaWrap}
          >
            <LinearGradient
              colors={canSave ? ['#E8FF8A', '#CAFD00'] : ['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaBtn}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#4A5E00" />
              ) : (
                <Text style={[styles.ctaText, canSave && styles.ctaTextActive]}>
                  {t('editFavorites.saveChanges')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  saveBtn: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // "Your favorites" quick-remove strip
  favStrip: {
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    marginBottom: 4,
  },
  favStripHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  favStripTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  favStripCount: {
    color: colors.onSurfaceVariant,
  },
  favStripHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  favStripScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 6,
  },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outline,
    maxWidth: 180,
  },
  favChipLogo: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  favChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
    maxWidth: 120,
  },

  // Sport tabs
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

  // Search
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

  // Region pills
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

  // Section header
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
  clearAllText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.3,
  },

  // League list
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

  // Empty state
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

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
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

  // ─── F1 Season Toggle ──────────────────────────────────
  f1SeasonContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  f1SeasonCard: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  f1SeasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  f1SeasonBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  f1SeasonTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  f1SeasonSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  f1Toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 3,
    justifyContent: 'center',
  },
  f1ToggleOn: {
    backgroundColor: '#CAFD00',
  },
  f1ToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6B7280',
  },
  f1ToggleKnobOn: {
    backgroundColor: '#0B0E11',
    alignSelf: 'flex-end',
  },
  f1Divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 18,
  },
  f1SeasonDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  f1GpList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  f1GpChip: {
    backgroundColor: 'rgba(255,68,68,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  f1GpChipMore: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  f1GpChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FF6B6B',
  },
});
