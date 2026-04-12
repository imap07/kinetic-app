import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { sportsApi } from '../api/sports';
import type { SportKey, LeagueFilter } from '../api/sports';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;
const PAGE_SIZE = 30;

interface PopularTeam {
  apiId: number;
  name: string;
  logo: string;
  leagueName?: string;
  countryName?: string;
  leagueApiId?: number;
  sport: SportKey;
}

const SPORT_COLORS: Record<string, string> = {
  football: '#5BEF90',
  basketball: '#FF7351',
  hockey: '#4FC3F7',
  'american-football': '#A78BFA',
  baseball: '#FBBF24',
  'formula-1': '#FF4444',
  afl: '#00BCD4',
  handball: '#FF9800',
  rugby: '#8BC34A',
  volleyball: '#E040FB',
  mma: '#F44336',
};

const SPORT_LABELS: Record<string, string> = {
  football: 'Soccer',
  basketball: 'Basketball',
  hockey: 'Hockey',
  'american-football': 'Football',
  baseball: 'Baseball',
  'formula-1': 'F1',
  afl: 'AFL',
  handball: 'Handball',
  rugby: 'Rugby',
  volleyball: 'Volleyball',
  mma: 'MMA',
};

interface Filters {
  countries: string[];
  leagueIds: number[];
  leagueNames: string[];
}

interface SportState {
  teams: PopularTeam[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  countries: string[];
  leagues: LeagueFilter[];
  filters: Filters;
}

const defaultState = (): SportState => ({
  teams: [], page: 0, hasMore: true,
  loading: false, loadingMore: false,
  countries: [], leagues: [],
  filters: { countries: [], leagueIds: [], leagueNames: [] },
});

interface Props {
  selectedSports: SportKey[];
  onComplete: (data: { sports: SportKey[]; favoriteTeams: { apiId: number; sport: SportKey }[]; favoriteDrivers?: { apiId: number; name: string; image: string; sport: 'formula-1' }[] }) => void;
  onBack?: () => void;
}

export function TeamSelectionScreen({ selectedSports, onComplete, onBack }: Props) {
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const [activeSport, setActiveSport] = useState<SportKey>(selectedSports[0]);
  const [selectedTeams, setSelectedTeams] = useState<Map<number, SportKey>>(new Map());
  const [sportStates, setSportStates] = useState<Record<string, SportState>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filterTab, setFilterTab] = useState<'country' | 'league'>('country');
  const [filterSearch, setFilterSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState<Filters>({ countries: [], leagueIds: [], leagueNames: [] });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [f1Teams, setF1Teams] = useState<import('../api/sports').F1Team[]>([]);
  const [f1Loading, setF1Loading] = useState(false);
  const [f1Search, setF1Search] = useState('');
  const [f1DriverSheet, setF1DriverSheet] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedDriverName, setSelectedDriverName] = useState<string | null>(null);
  const [selectedDriverImage, setSelectedDriverImage] = useState<string | null>(null);

  const getState = (sport: SportKey): SportState => sportStates[sport] ?? defaultState();

  const updateState = useCallback((sport: SportKey, patch: Partial<SportState>) => {
    setSportStates(prev => ({ ...prev, [sport]: { ...(prev[sport] ?? defaultState()), ...patch } }));
  }, []);

  const resetAndReload = useCallback((sport: SportKey, newFilters?: Partial<Filters>) => {
    setSportStates(prev => {
      const cur = prev[sport] ?? defaultState();
      return {
        ...prev,
        [sport]: {
          ...cur,
          teams: [], page: 0, hasMore: true,
          filters: newFilters ? { ...cur.filters, ...newFilters } : cur.filters,
        },
      };
    });
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  useEffect(() => { resetAndReload(activeSport); }, [activeSport, debouncedSearch]);

  const [f1DebouncedSearch, setF1DebouncedSearch] = useState('');
  const f1SearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (f1SearchTimer.current) clearTimeout(f1SearchTimer.current);
    f1SearchTimer.current = setTimeout(() => setF1DebouncedSearch(f1Search), 350);
    return () => { if (f1SearchTimer.current) clearTimeout(f1SearchTimer.current); };
  }, [f1Search]);

  useEffect(() => {
    if (activeSport !== 'formula-1' || !tokens?.accessToken) return;
    setF1Loading(true);
    sportsApi.getF1Teams(tokens.accessToken, f1DebouncedSearch.trim() || undefined)
      .then(data => { console.log('[F1] response:', JSON.stringify(data).slice(0, 200)); setF1Teams(data.teams || []); })
      .catch(e => { console.error('[F1] error:', e?.message || e); setF1Teams([]); })
      .finally(() => setF1Loading(false));
  }, [activeSport, tokens?.accessToken, f1DebouncedSearch]);

  // Fetch page
  const fetchPage = useCallback(async (sport: SportKey) => {
    if (!tokens?.accessToken) return;
    const state = sportStates[sport] ?? defaultState();
    if (state.loading || state.loadingMore || !state.hasMore) return;
    const nextPage = state.page + 1;
    const isFirst = nextPage === 1;
    updateState(sport, isFirst ? { loading: true } : { loadingMore: true });
    try {
      const data = await sportsApi.getPopularTeams(tokens.accessToken, sport, {
        page: nextPage, limit: PAGE_SIZE,
        countries: state.filters.countries.length ? state.filters.countries : undefined,
        leagueIds: state.filters.leagueIds.length ? state.filters.leagueIds : undefined,
        search: debouncedSearch.trim() || undefined,
      });
      const newTeams = (data.teams || []).map((t: any) => ({ ...t, sport }));
      setSportStates(prev => {
        const cur = prev[sport] ?? defaultState();
        return {
          ...prev,
          [sport]: {
            ...cur,
            teams: isFirst ? newTeams : [...cur.teams, ...newTeams],
            page: nextPage,
            hasMore: data.hasMore ?? false,
            loading: false, loadingMore: false,
            countries: isFirst && data.countries ? data.countries : cur.countries,
            leagues: isFirst && data.leagues ? data.leagues : cur.leagues,
          },
        };
      });
    } catch {
      updateState(sport, { loading: false, loadingMore: false, hasMore: false });
    }
  }, [tokens?.accessToken, sportStates, debouncedSearch, updateState]);

  useEffect(() => {
    const state = getState(activeSport);
    if (state.page === 0 && state.hasMore && !state.loading) fetchPage(activeSport);
  }, [activeSport, sportStates, debouncedSearch]);

  const handleEndReached = useCallback(() => {
    const state = getState(activeSport);
    if (!state.loadingMore && state.hasMore && !state.loading) fetchPage(activeSport);
  }, [activeSport, sportStates, fetchPage]);

  const toggleTeam = useCallback((team: PopularTeam) => {
    setSelectedTeams(prev => {
      const next = new Map(prev);
      if (next.has(team.apiId)) next.delete(team.apiId);
      else next.set(team.apiId, team.sport);
      return next;
    });
  }, []);

  const applyDraft = useCallback(() => {
    resetAndReload(activeSport, draftFilters);
    setShowFilterSheet(false);
  }, [activeSport, draftFilters, resetAndReload]);

  const clearFilters = useCallback(() => {
    resetAndReload(activeSport, { countries: [], leagueIds: [], leagueNames: [] });
    setDraftFilters({ countries: [], leagueIds: [], leagueNames: [] });
    setShowFilterSheet(false);
  }, [activeSport, resetAndReload]);

  const state = getState(activeSport);
  const sportColor = SPORT_COLORS[activeSport] || colors.primary;
  const totalSelected = selectedTeams.size;
  const canContinue = totalSelected >= 1;
  const hasActiveFilters = state.filters.countries.length > 0 || state.filters.leagueIds.length > 0;

  // Filter countries/leagues in sheet by search query
  const sheetSearchLower = filterSearch.toLowerCase();
  const filteredCountries = state.countries.filter(c =>
    !sheetSearchLower || c.toLowerCase().includes(sheetSearchLower)
  );
  const baseLeagues = draftFilters.countries.length
    ? state.leagues.filter(l => draftFilters.countries.includes(l.countryName || ''))
    : state.leagues;
  const filteredLeaguesInSheet = baseLeagues.filter(l =>
    !sheetSearchLower || l.name.toLowerCase().includes(sheetSearchLower) || (l.countryName || '').toLowerCase().includes(sheetSearchLower)
  );

  const renderTeamCard = useCallback(({ item }: { item: PopularTeam }) => {
    const isSelected = selectedTeams.has(item.apiId);
    const color = SPORT_COLORS[item.sport] || colors.primary;
    return (
      <TouchableOpacity
        style={[styles.teamCard, isSelected && { borderColor: color }]}
        onPress={() => toggleTeam(item)}
        activeOpacity={0.7}
      >
        {isSelected && (
          <View style={[styles.teamCheck, { backgroundColor: color }]}>
            <Ionicons name="checkmark" size={10} color="#0B0E11" />
          </View>
        )}
        <ExpoImage
          source={{ uri: item.logo }}
          style={styles.teamLogo}
          contentFit="contain"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
        <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
        {item.leagueName ? (
          <Text style={styles.teamLeague} numberOfLines={1}>{item.leagueName}</Text>
        ) : item.countryName ? (
          <Text style={styles.teamLeague} numberOfLines={1}>{item.countryName}</Text>
        ) : null}
      </TouchableOpacity>
    );
  }, [selectedTeams, toggleTeam]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.stepLabel}>{t('teamSelection.step', 'STEP 2 OF 4')}</Text>
            <Text style={styles.title}>{t('teamSelection.title', 'Pick your favorites')}</Text>
          </View>
        </View>
      </View>

      {/* Sport tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}
      >
        {selectedSports.map((sport) => {
          const isActive = sport === activeSport;
          const color = SPORT_COLORS[sport] || colors.primary;
          return (
            <TouchableOpacity
              key={sport}
              style={[styles.tab, isActive && { backgroundColor: color + '22', borderColor: color }]}
              onPress={() => { setActiveSport(sport); setSearchQuery(''); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && { color }]}>
                {SPORT_LABELS[sport] || sport}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search + Filter row */}
      <View style={styles.filterRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={colors.onSurfaceDim} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeSport === 'formula-1' ? 'Search constructors...' : 'Search teams...'}
            placeholderTextColor={colors.onSurfaceDim}
            value={activeSport === 'formula-1' ? f1Search : searchQuery}
            onChangeText={activeSport === 'formula-1' ? setF1Search : setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {(activeSport === 'formula-1' ? f1Search : searchQuery).length > 0 && (
            <TouchableOpacity onPress={() => activeSport === 'formula-1' ? setF1Search('') : setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.onSurfaceDim} />
            </TouchableOpacity>
          )}
        </View>

        {activeSport !== 'formula-1' && (
          <TouchableOpacity
            style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
            onPress={() => { setFilterTab('country'); setFilterSearch(''); setDraftFilters(state.filters); setShowFilterSheet(true); }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={hasActiveFilters ? colors.primary : colors.onSurfaceVariant}
            />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        )}
      </View>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll} contentContainerStyle={styles.chipsContainer}
        >
          {state.filters.countries.map(c => (
            <TouchableOpacity
              key={`c-${c}`} style={styles.chip}
              onPress={() => {
                const newCountries = state.filters.countries.filter(x => x !== c);
                resetAndReload(activeSport, { countries: newCountries });
              }}
            >
              <Text style={styles.chipText}>{c}</Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          ))}
          {state.filters.leagueNames.map((name, i) => (
            <TouchableOpacity
              key={`l-${state.filters.leagueIds[i]}`} style={styles.chip}
              onPress={() => {
                const newIds = state.filters.leagueIds.filter((_, j) => j !== i);
                const newNames = state.filters.leagueNames.filter((_, j) => j !== i);
                resetAndReload(activeSport, { leagueIds: newIds, leagueNames: newNames });
              }}
            >
              <Text style={styles.chipText}>{name}</Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.chipClear} onPress={clearFilters}>
            <Text style={styles.chipClearText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Teams grid */}
      {activeSport === 'formula-1' ? (
        /* ── F1: Constructor grid ── */
        f1Loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={sportColor} />
          </View>
        ) : (
          <FlatList
            data={f1Teams}
            keyExtractor={(item) => `f1-${item.apiId}`}
            renderItem={({ item }) => {
              const isSelected = selectedTeams.has(item.apiId);
              return (
                <TouchableOpacity
                  style={[styles.teamCard, styles.f1Card, isSelected && { borderColor: sportColor }]}
                  onPress={() => toggleTeam({ apiId: item.apiId, name: item.name, logo: item.logo || '', sport: 'formula-1' as any, leagueApiId: 0 })}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <View style={[styles.teamCheck, { backgroundColor: sportColor }]}>
                      <Ionicons name="checkmark" size={10} color="#0B0E11" />
                    </View>
                  )}
                  {item.position != null && (
                    <View style={styles.f1Position}>
                      <Text style={styles.f1PositionText}>{item.position}</Text>
                    </View>
                  )}
                  <ExpoImage
                    source={{ uri: item.logo || '' }}
                    style={styles.teamLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
                  {item.points != null && (
                    <Text style={styles.teamLeague}>{item.points} pts</Text>
                  )}
                  {item.drivers.length > 0 && (
                    <View style={styles.f1Drivers}>
                      {item.drivers.slice(0, 2).map(d => (
                        <Text key={d.apiId} style={styles.f1DriverName} numberOfLines={1}>{d.abbr || d.name.split(' ').pop()}</Text>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            numColumns={2}
            columnWrapperStyle={styles.teamRow}
            contentContainerStyle={styles.teamsGrid}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <TouchableOpacity style={styles.f1DriverBtn} onPress={() => setF1DriverSheet(true)} activeOpacity={0.8}>
                <Ionicons name="person-circle-outline" size={18} color={selectedDriverId ? sportColor : colors.onSurfaceVariant} />
                <Text style={[styles.f1DriverBtnText, selectedDriverId ? { color: sportColor } : null]}>
                  {selectedDriverId ? `Following: ${selectedDriverName}` : 'Follow a driver (optional)'}
                </Text>
                <Ionicons name="chevron-forward" size={15} color={colors.onSurfaceDim} />
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No constructors found</Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 120 }} />}
          />
        )
      ) : state.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={sportColor} />
        </View>
      ) : (
        <FlatList
          data={state.teams}
          keyExtractor={(item) => `${item.sport}-${item.apiId}`}
          renderItem={renderTeamCard}
          numColumns={2}
          columnWrapperStyle={styles.teamRow}
          contentContainerStyle={styles.teamsGrid}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            state.loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={sportColor} />
                <View style={{ height: 100 }} />
              </View>
            ) : <View style={{ height: 120 }} />
          }
          ListEmptyComponent={
            !state.loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={36} color={colors.onSurfaceDim} />
                <Text style={styles.emptyText}>No teams found</Text>
                {(searchQuery || hasActiveFilters) && (
                  <TouchableOpacity onPress={clearFilters} style={{ marginTop: 8 }}>
                    <Text style={styles.emptyAction}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      )}

      {/* ─── F1 Driver Sheet ─── */}
      <Modal visible={f1DriverSheet} animationType="slide" transparent onRequestClose={() => setF1DriverSheet(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setF1DriverSheet(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Follow a Driver</Text>
              {selectedDriverId && (
                <TouchableOpacity onPress={() => { setSelectedDriverId(null); setSelectedDriverName(null); setSelectedDriverImage(null); setF1DriverSheet(false); }}>
                  <Text style={styles.sheetClear}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {f1Teams.flatMap(t => t.drivers).length === 0 ? (
                <Text style={styles.sheetHint}>No drivers available</Text>
              ) : (
                f1Teams.flatMap(t => t.drivers.map(d => ({ ...d, teamName: t.name, teamLogo: t.logo }))).map(driver => {
                  const isSelected = selectedDriverId === driver.apiId;
                  return (
                    <TouchableOpacity
                      key={driver.apiId}
                      style={[styles.optionRow, isSelected && styles.optionRowActive]}
                      onPress={() => {
                        setSelectedDriverId(driver.apiId);
                        setSelectedDriverName(driver.name);
                        setSelectedDriverImage(driver.image || '');
                        setF1DriverSheet(false);
                      }}
                    >
                      {driver.image ? (
                        <ExpoImage source={{ uri: driver.image }} style={styles.f1DriverAvatar} contentFit="cover" cachePolicy="memory-disk" />
                      ) : (
                        <View style={[styles.f1DriverAvatar, { backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="person" size={16} color={colors.onSurfaceDim} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionText, isSelected && styles.optionTextActive]} numberOfLines={1}>{driver.name}</Text>
                        <Text style={styles.optionSub}>{driver.teamName}{driver.number ? ` · #${driver.number}` : ''}{driver.points != null ? ` · ${driver.points}pts` : ''}</Text>
                      </View>
                      {isSelected
                        ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.optionCheck} />
                        : <View style={styles.optionCircle} />}
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Filter Bottom Sheet ─── */}
      <Modal visible={showFilterSheet} animationType="slide" transparent onRequestClose={() => setShowFilterSheet(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowFilterSheet(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Teams</Text>
              {(draftFilters.countries.length > 0 || draftFilters.leagueIds.length > 0) && (
                <TouchableOpacity onPress={() => setDraftFilters({ countries: [], leagueIds: [], leagueNames: [] })}>
                  <Text style={styles.sheetClear}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tabs: Country / League */}
            <View style={styles.sheetTabs}>
              <TouchableOpacity
                style={[styles.sheetTab, filterTab === 'country' && styles.sheetTabActive]}
                onPress={() => { setFilterTab('country'); setFilterSearch(''); }}
              >
                <Text style={[styles.sheetTabText, filterTab === 'country' && styles.sheetTabTextActive]}>
                  Country
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetTab, filterTab === 'league' && styles.sheetTabActive]}
                onPress={() => { setFilterTab('league'); setFilterSearch(''); }}
              >
                <Text style={[styles.sheetTabText, filterTab === 'league' && styles.sheetTabTextActive]}>
                  League
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sheet search */}
            <View style={styles.sheetSearchContainer}>
              <Ionicons name="search" size={15} color={colors.onSurfaceDim} />
              <TextInput
                style={styles.sheetSearchInput}
                placeholder={filterTab === 'country' ? 'Search country...' : 'Search league...'}
                placeholderTextColor={colors.onSurfaceDim}
                value={filterSearch}
                onChangeText={setFilterSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {filterSearch.length > 0 && (
                <TouchableOpacity onPress={() => setFilterSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={15} color={colors.onSurfaceDim} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {filterTab === 'country' ? (
                <>
                  {filteredCountries.map((c) => {
                    const isSelected = draftFilters.countries.includes(c);
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.optionRow, isSelected && styles.optionRowActive]}
                        onPress={() => {
                          const next = isSelected
                            ? draftFilters.countries.filter(x => x !== c)
                            : [...draftFilters.countries, c];
                          setDraftFilters(d => ({ ...d, countries: next }));
                        }}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{c}</Text>
                        {isSelected
                          ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.optionCheck} />
                          : <View style={styles.optionCircle} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  {filteredLeaguesInSheet.length === 0 && (
                    <Text style={styles.sheetHint}>
                      {state.loading ? 'Loading...' : sheetSearchLower ? 'No leagues found' : 'No leagues available'}
                    </Text>
                  )}
                  {filteredLeaguesInSheet.map((lg) => {
                    const isSelected = draftFilters.leagueIds.includes(lg.apiId);
                    return (
                      <TouchableOpacity
                        key={lg.apiId}
                        style={[styles.optionRow, isSelected && styles.optionRowActive]}
                        onPress={() => {
                          if (isSelected) {
                            const idx = draftFilters.leagueIds.indexOf(lg.apiId);
                            setDraftFilters(d => ({
                              ...d,
                              leagueIds: d.leagueIds.filter((_, i) => i !== idx),
                              leagueNames: d.leagueNames.filter((_, i) => i !== idx),
                            }));
                          } else {
                            setDraftFilters(d => ({
                              ...d,
                              leagueIds: [...d.leagueIds, lg.apiId],
                              leagueNames: [...d.leagueNames, lg.name],
                            }));
                          }
                        }}
                      >
                        {lg.logo ? (
                          <ExpoImage source={{ uri: lg.logo }} style={styles.leagueLogo} contentFit="contain" cachePolicy="memory-disk" />
                        ) : (
                          <Ionicons name="trophy-outline" size={18} color={colors.onSurfaceVariant} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionText, isSelected && styles.optionTextActive]} numberOfLines={1}>
                            {lg.name}
                          </Text>
                          {lg.countryName && !draftFilters.countries.length && (
                            <Text style={styles.optionSub}>{lg.countryName}</Text>
                          )}
                        </View>
                        {isSelected
                          ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.optionCheck} />
                          : <View style={styles.optionCircle} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Apply button */}
            <View style={styles.sheetApplyContainer}>
              <TouchableOpacity
                style={[styles.sheetApplyBtn, (draftFilters.countries.length === 0 && draftFilters.leagueIds.length === 0) && styles.sheetApplyBtnClear]}
                onPress={applyDraft}
                activeOpacity={0.85}
              >
                <Text style={[styles.sheetApplyText, (draftFilters.countries.length === 0 && draftFilters.leagueIds.length === 0) && styles.sheetApplyTextClear]}>
                  {draftFilters.countries.length === 0 && draftFilters.leagueIds.length === 0
                    ? 'Show All'
                    : `Apply${draftFilters.countries.length + draftFilters.leagueIds.length > 0 ? ` (${draftFilters.countries.length + draftFilters.leagueIds.length} selected)` : ''}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaSummary}>
          <Text style={styles.ctaSummaryText}>
            {totalSelected === 0
              ? 'Select at least 1 team to continue'
              : `${totalSelected} team${totalSelected !== 1 ? 's' : ''} selected`}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85} onPress={() => {
            const favoriteTeams = Array.from(selectedTeams.entries()).map(([apiId, sport]) => ({ apiId, sport }));
            const favoriteDrivers = selectedDriverId ? [{ apiId: selectedDriverId, name: selectedDriverName || '', image: selectedDriverImage || '', sport: 'formula-1' as const }] : [];
            onComplete({ sports: selectedSports, favoriteTeams, favoriteDrivers });
          }}
          disabled={!canContinue} style={styles.ctaWrap}
        >
          <LinearGradient
            colors={canContinue ? ['#E8FF8A', '#CAFD00'] : ['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.04)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Text style={[styles.ctaText, canContinue && styles.ctaTextActive]}>
              {t('sportSelection.next', 'NEXT')} →
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: {
    fontFamily: 'Inter_500Medium', fontSize: 11,
    color: colors.primary, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 2,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24,
    color: colors.onSurface, letterSpacing: -0.5,
  },

  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabsContainer: { paddingHorizontal: 20, paddingVertical: 8, gap: 8, alignItems: 'center' },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: colors.outline, backgroundColor: colors.surfaceContainer,
    marginRight: 4, alignSelf: 'flex-start',
  },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6, gap: 8 },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.surfaceContainer, borderRadius: 12, gap: 8,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurface, padding: 0 },
  filterBtn: {
    width: 44, height: 44,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
    position: 'relative',
  },
  filterBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(202,253,0,0.08)' },
  filterDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.primary,
  },

  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsContainer: { paddingHorizontal: 16, paddingBottom: 6, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(202,253,0,0.1)', borderWidth: 1,
    borderColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.primary },
  chipClear: { paddingHorizontal: 10, paddingVertical: 4 },
  chipClearText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.onSurfaceDim },

  teamsGrid: { paddingHorizontal: CARD_PADDING, paddingTop: 8 },
  teamRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  teamCard: {
    width: CARD_WIDTH, backgroundColor: colors.surfaceContainer,
    borderRadius: 14, padding: 14, borderWidth: 1.5,
    borderColor: 'transparent', alignItems: 'center', gap: 8,
  },
  teamCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  teamLogo: { width: 44, height: 44, borderRadius: 8 },
  teamName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.onSurface, textAlign: 'center' },
  teamLeague: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.onSurfaceDim, textAlign: 'center' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingMore: { alignItems: 'center', paddingVertical: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurfaceVariant },
  emptyAction: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.primary },

  // Filter sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12,
    height: '72%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  sheetTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.onSurface },
  sheetClear: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.primary },
  sheetHint: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.onSurfaceDim, paddingHorizontal: 20, paddingTop: 12 },

  sheetSearchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12, gap: 8,
  },
  sheetSearchInput: {
    flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14,
    color: colors.onSurface, padding: 0,
  },

  sheetTabs: {
    flexDirection: 'row', marginHorizontal: 20,
    marginBottom: 12, backgroundColor: colors.surfaceContainer,
    borderRadius: 12, padding: 3,
  },
  sheetTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  sheetTabActive: { backgroundColor: colors.background },
  sheetTabText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant },
  sheetTabTextActive: { color: colors.onSurface, fontFamily: 'Inter_600SemiBold' },

  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  optionRowActive: { backgroundColor: 'rgba(202,253,0,0.05)' },
  optionText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.onSurface },
  optionTextActive: { fontFamily: 'Inter_600SemiBold', color: colors.primary },
  optionSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.onSurfaceDim },
  optionCheck: { marginLeft: 'auto' as any },
  optionCircle: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: colors.outline,
    marginLeft: 'auto' as any,
  },
  leagueLogo: { width: 24, height: 24, borderRadius: 4 },
  sheetApplyContainer: {
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  sheetApplyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
  },
  sheetApplyBtnClear: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.outline,
  },
  sheetApplyText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15,
    color: '#1A2800', letterSpacing: 0.3,
  },
  sheetApplyTextClear: { color: colors.onSurfaceVariant },

  f1Card: { minHeight: 140 },
  f1Position: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  f1PositionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onSurfaceDim },
  f1Drivers: { flexDirection: 'row', gap: 6, marginTop: 2 },
  f1DriverName: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.onSurfaceDim },
  f1DriverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12, marginTop: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  f1DriverBtnText: {
    flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  f1DriverAvatar: { width: 36, height: 36, borderRadius: 18 },

  ctaContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 10,
    backgroundColor: 'rgba(11,14,17,0.96)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  ctaSummary: { alignItems: 'center', marginBottom: 8 },
  ctaSummaryText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  ctaWrap: { borderRadius: 14, overflow: 'hidden' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, gap: 8,
  },
  ctaText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: 'rgba(202,253,0,0.3)', letterSpacing: 1.2 },
  ctaTextActive: { color: '#3A4A00' },
});
