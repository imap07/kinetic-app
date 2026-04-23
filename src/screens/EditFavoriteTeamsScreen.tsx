/**
 * EditFavoriteTeamsScreen
 * ───────────────────────
 * Profile-side editor for `user.favoriteTeams`, organized **by league**
 * (vs the onboarding TeamSelectionScreen which shows a flat team grid
 * per sport). Each league the user already has teams in becomes a
 * section that exposes its full roster; the user can add/remove
 * individual teams or bulk-select the whole league via "Select all".
 *
 * Design choices worth remembering:
 *   - Local state drives the UI (`selected: Map<sport:teamApiId, entry>`);
 *     we only hit the server on SAVE via `setFavoriteTeams` with the
 *     complete list. This keeps the UX snappy and avoids N roundtrips
 *     for a user toggling many checkboxes, matching the pattern used by
 *     EditFavoriteLeaguesScreen.
 *   - "Select all" is resolved client-side by expanding `teamsByLeague`
 *     (already fetched when the section rendered), so it's instant
 *     without a bulk-add-league server call. The server endpoint exists
 *     as a convenience (e.g. onboarding / programmatic callers) but the
 *     editor doesn't need it.
 *   - "Add another league" opens a picker that lets the user pin a new
 *     league section — initially with zero selections — so they can
 *     then either tap individual teams or hit "Select all".
 *   - Cross-sport visibility is handled by the top SportTabBar, mirroring
 *     the Leagues editor.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Two-column grid math matches TeamSelectionScreen / EditFavoriteLeaguesScreen
// so cards don't look different on this screen vs the rest of the app.
const CARD_GAP = 10;
// Sections are inset from the edges by 16 and padded inside by 8.
const SECTION_INSET = 16;
const SECTION_INNER_PADDING = 8;
const GRID_H_PADDING = SECTION_INSET + SECTION_INNER_PADDING;
const CARD_WIDTH =
  (SCREEN_WIDTH - GRID_H_PADDING * 2 - CARD_GAP) / 2;
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { favoriteTeamsApi, FavoriteTeam } from '../api/favoriteTeams';
import { sportsApi, SPORT_TABS, PopularTeam, SportLeague, SportKey } from '../api/sports';

// ─── Sport colors (match EditFavoriteLeaguesScreen) ──────

const SPORT_COLORS: Record<string, string> = {
  football: '#5BEF90',
  basketball: '#FF7351',
  hockey: '#4FC3F7',
  'american-football': '#A78BFA',
  baseball: '#FBBF24',
  'formula-1': '#FF4444',
  afl: '#FF9800',
  handball: '#26A69A',
  rugby: '#D4AF37',
  volleyball: '#EF5350',
  mma: '#E53935',
};

// ─── Helpers ─────────────────────────────────────────────

const teamKey = (sport: string, teamApiId: number) => `${sport}:${teamApiId}`;

// ─── SportTabBar (local copy — matches Leagues editor look) ─

function SportTabBar({
  sports,
  active,
  onSelect,
  teamCounts,
}: {
  sports: string[];
  active: string;
  onSelect: (s: string) => void;
  teamCounts: Record<string, number>;
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
          const meta = SPORT_TABS.find((x) => x.key === s);
          const color = SPORT_COLORS[s] || colors.primary;
          const count = teamCounts[s];

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

// ─── Team card (memoized) ────────────────────────────────

const TeamCard = memo(function TeamCard({
  team,
  selected,
  accent,
  onToggle,
}: {
  team: PopularTeam;
  selected: boolean;
  // Sport-specific accent color, used for the selected border + checkmark
  // background so the grid feels visually consistent with the sport the
  // user is currently managing (matches TeamSelectionScreen semantics).
  accent: string;
  onToggle: (t: PopularTeam) => void;
}) {
  const handlePress = useCallback(() => onToggle(team), [onToggle, team]);
  return (
    <TouchableOpacity
      style={[styles.teamCard, selected && { borderColor: accent }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {selected && (
        <View style={[styles.teamCheck, { backgroundColor: accent }]}>
          <Ionicons name="checkmark" size={10} color="#0B0E11" />
        </View>
      )}
      {team.logo ? (
        <ExpoImage
          source={{ uri: team.logo }}
          style={styles.teamLogo}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.teamLogo, styles.teamLogoFallback]}>
          <Ionicons name="shield-outline" size={22} color={colors.onSurfaceDim} />
        </View>
      )}
      <Text style={styles.teamName} numberOfLines={1}>
        {team.name}
      </Text>
      {team.countryName ? (
        <Text style={styles.teamCountry} numberOfLines={1}>
          {team.countryName}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});

// ─── League section ──────────────────────────────────────

function LeagueSection({
  sport,
  accent,
  leagueApiId,
  leagueName,
  leagueLogo,
  teams,
  loading,
  expanded,
  onToggleExpand,
  selectedKeys,
  onToggleTeam,
  onSelectAll,
  onDeselectAll,
  onRemoveSection,
}: {
  sport: string;
  accent: string;
  leagueApiId: number | null;
  leagueName: string;
  leagueLogo?: string;
  teams: PopularTeam[];
  loading: boolean;
  // Accordion state — when `false`, the team grid is collapsed and only
  // the header row is shown. We keep the collapsed state lifted so it
  // survives list re-renders (adding/removing sections, sport switches).
  expanded: boolean;
  onToggleExpand: () => void;
  selectedKeys: Set<string>;
  onToggleTeam: (sport: string, team: PopularTeam) => void;
  onSelectAll: (sport: string, teams: PopularTeam[]) => void;
  onDeselectAll: (sport: string, teams: PopularTeam[]) => void;
  onRemoveSection?: () => void;
}) {
  const { t } = useTranslation();
  const selectedCount = teams.filter((tm) => selectedKeys.has(teamKey(sport, tm.apiId))).length;
  const allSelected = teams.length > 0 && selectedCount === teams.length;

  return (
    <View style={styles.leagueSection}>
      {/* Whole header row is the accordion toggle. Select-all / hide
          buttons stopPropagation via their own onPress so the tap only
          opens/closes when the user actually hits the header area. */}
      <TouchableOpacity
        style={styles.leagueSectionHeader}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <Feather
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={18}
          color={colors.onSurfaceDim}
          style={styles.leagueHeaderChevron}
        />
        {leagueLogo ? (
          <ExpoImage
            source={{ uri: leagueLogo }}
            style={styles.leagueHeaderLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.leagueHeaderLogo, styles.leagueHeaderLogoFallback]}>
            <Ionicons name="trophy-outline" size={16} color={colors.onSurfaceDim} />
          </View>
        )}
        <View style={styles.leagueHeaderText}>
          <Text style={styles.leagueHeaderName} numberOfLines={1}>
            {leagueName}
          </Text>
          <Text style={[styles.leagueHeaderCount, { color: accent }]}>
            {selectedCount} / {teams.length || '?'}
          </Text>
        </View>
        {teams.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              allSelected ? onDeselectAll(sport, teams) : onSelectAll(sport, teams)
            }
            style={[
              styles.selectAllBtn,
              { borderColor: accent, backgroundColor: allSelected ? 'transparent' : accent },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.selectAllText,
                { color: allSelected ? accent : '#0B0E11' },
              ]}
            >
              {allSelected
                ? t('editFavoriteTeams.deselectAll', 'Deselect all')
                : t('editFavoriteTeams.selectAll', 'Select all')}
            </Text>
          </TouchableOpacity>
        )}
        {onRemoveSection && (
          <TouchableOpacity
            onPress={onRemoveSection}
            style={styles.removeSectionBtn}
            hitSlop={8}
            accessibilityLabel={t(
              'editFavoriteTeams.hideLeagueSection',
              'Hide this league section',
            )}
          >
            <Feather name="eye-off" size={14} color={colors.onSurfaceDim} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {expanded && (
        loading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator size="small" color={accent} />
          </View>
        ) : teams.length === 0 ? (
          <Text style={styles.sectionEmpty}>
            {t('editFavoriteTeams.noTeamsForLeague', 'No teams available for this league yet.')}
          </Text>
        ) : (
          <View style={styles.teamGrid}>
            {teams.map((tm) => (
              <TeamCard
                key={`${sport}-${tm.apiId}`}
                team={tm}
                accent={accent}
                selected={selectedKeys.has(teamKey(sport, tm.apiId))}
                onToggle={(t) => onToggleTeam(sport, t)}
              />
            ))}
          </View>
        )
      )}
    </View>
  );
}

// ─── Add league modal ────────────────────────────────────
//
// Quick picker to "pin" a new league as a section on the active sport.
// Once pinned, it behaves exactly like any other section (fetched
// lazily, select-all supported). We don't write anything to
// `favoriteLeagues` here — this screen manages teams only.

function AddLeagueModal({
  visible,
  onClose,
  sport,
  onPick,
  excludeIds,
}: {
  visible: boolean;
  onClose: () => void;
  sport: string;
  onPick: (league: SportLeague) => void;
  excludeIds: Set<number>;
}) {
  const { t } = useTranslation();
  const { tokens } = useAuth();
  const [leagues, setLeagues] = useState<SportLeague[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (!tokens?.accessToken) return;
    let cancelled = false;
    setLoading(true);
    sportsApi
      .getLeagues(tokens.accessToken, sport as SportKey)
      .then((res) => {
        if (!cancelled) setLeagues(res);
      })
      .catch(() => {
        if (!cancelled) setLeagues([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, sport, tokens?.accessToken]);

  const filtered = useMemo(() => {
    if (!leagues) return [];
    const available = leagues.filter((l) => !excludeIds.has(l.apiId));
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter(
      (l) =>
        l.name.toLowerCase().includes(q) || (l.countryName || '').toLowerCase().includes(q),
    );
  }, [leagues, query, excludeIds]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('editFavoriteTeams.addLeagueTitle', 'Add a league')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={colors.onSurfaceDim} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('editFavoriteTeams.searchLeague', 'Search leagues…')}
              placeholderTextColor={colors.onSurfaceDim}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginVertical: 40 }}
            />
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {filtered.length === 0 ? (
                <Text style={styles.modalEmpty}>
                  {t('editFavoriteTeams.noMoreLeagues', 'No more leagues to add.')}
                </Text>
              ) : (
                filtered.map((lg) => (
                  <TouchableOpacity
                    key={`pick-${lg.apiId}`}
                    style={styles.modalLeagueRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      onPick(lg);
                      onClose();
                    }}
                  >
                    {lg.logo ? (
                      <ExpoImage
                        source={{ uri: lg.logo }}
                        style={styles.modalLeagueLogo}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={[styles.modalLeagueLogo, styles.leagueHeaderLogoFallback]}>
                        <Ionicons
                          name="trophy-outline"
                          size={14}
                          color={colors.onSurfaceDim}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLeagueName} numberOfLines={1}>
                        {lg.name}
                      </Text>
                      {lg.countryName ? (
                        <Text style={styles.modalLeagueCountry} numberOfLines={1}>
                          {lg.countryName}
                        </Text>
                      ) : null}
                    </View>
                    <Feather name="plus" size={18} color={colors.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────

export function EditFavoriteTeamsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { tokens, user, refreshProfile } = useAuth();
  const { t } = useTranslation();

  // Sport list comes from the user's favorite sports; fall back to
  // football if nothing is configured (same convention as the Leagues
  // editor).
  const sports = useMemo(
    () =>
      user?.favoriteSports && user.favoriteSports.length > 0
        ? user.favoriteSports
        : ['football'],
    [user?.favoriteSports],
  );

  const [activeSport, setActiveSport] = useState<string>(sports[0]);
  const [saving, setSaving] = useState(false);
  const [addLeagueOpen, setAddLeagueOpen] = useState(false);

  // `selected` is the source of truth for the editor. Keyed by
  // `sport:teamApiId` so duplicates across sports can't collide. Values
  // hold the full FavoriteTeam entry (sport/team/league metadata) ready
  // to PATCH back in a single setFavoriteTeams call.
  const [selected, setSelected] = useState<Map<string, FavoriteTeam>>(() => {
    const map = new Map<string, FavoriteTeam>();
    for (const ft of user?.favoriteTeams || []) {
      map.set(teamKey(ft.sport, ft.teamApiId), ft);
    }
    return map;
  });

  // Fetched teams per `sport:leagueApiId` — lazy populated per section.
  const [teamsByLeague, setTeamsByLeague] = useState<Map<string, PopularTeam[]>>(
    () => new Map(),
  );
  const [sectionLoading, setSectionLoading] = useState<Set<string>>(new Set());

  // Per-sport cached league metadata, keyed by sport. `getPopularTeams`
  // doesn't return the league's own logo, so we fetch `/sports/:sport/
  // leagues` once per sport we need to display and use it to enrich the
  // pins (name + logo). The AddLeagueModal fetches the same list, so if
  // we wanted we could share it further — in practice the response is
  // small and cached locally by the API client, so duplicating here is
  // cheap and keeps the module's state model simple.
  const [leaguesBySport, setLeaguesBySport] = useState<Record<string, SportLeague[]>>({});

  // Per-sport list of league sections to render. Starts with whatever
  // leagues the user already has teams in; "Add another league" pushes
  // new ids in here. F1 is special-cased below because its picks are
  // constructor-level without a real league concept.
  const [pinnedLeagues, setPinnedLeagues] = useState<Record<string, LeaguePin[]>>({});
  // Leagues the user hid via the eye-off button — persist only in
  // memory (per-session) so a stale auto-derived section doesn't keep
  // bouncing back after save.
  const [hiddenLeagues, setHiddenLeagues] = useState<Record<string, Set<number>>>({});
  // Accordion collapsed state per `sport:leagueApiId`. By default a
  // section starts expanded (so the user sees what's in it); tapping the
  // header toggles. Newly-added sections also start expanded — the user
  // just picked that league and wants to see its teams immediately.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggleSectionCollapsed = useCallback((sport: string, leagueApiId: number) => {
    const key = `${sport}:${leagueApiId}`;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const collapseAll = useCallback(
    (sport: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        const pins = pinnedLeagues[sport] || [];
        const hidden = hiddenLeagues[sport] || new Set<number>();
        for (const p of pins) {
          if (hidden.has(p.leagueApiId)) continue;
          next.add(`${sport}:${p.leagueApiId}`);
        }
        return next;
      });
    },
    [pinnedLeagues, hiddenLeagues],
  );

  const expandAll = useCallback(
    (sport: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        const pins = pinnedLeagues[sport] || [];
        for (const p of pins) next.delete(`${sport}:${p.leagueApiId}`);
        return next;
      });
    },
    [pinnedLeagues],
  );

  // Seed `pinnedLeagues` from user.favoriteTeams once.
  useEffect(() => {
    const bySport: Record<string, LeaguePin[]> = {};
    const seen: Record<string, Set<number>> = {};
    for (const ft of user?.favoriteTeams || []) {
      if (!ft.leagueApiId) continue;
      const key = String(ft.leagueApiId);
      seen[ft.sport] = seen[ft.sport] || new Set<number>();
      if (seen[ft.sport].has(ft.leagueApiId)) continue;
      seen[ft.sport].add(ft.leagueApiId);
      bySport[ft.sport] = bySport[ft.sport] || [];
      bySport[ft.sport].push({
        leagueApiId: ft.leagueApiId,
        name: ft.leagueName || `League #${key}`,
        logo: undefined,
      });
    }
    setPinnedLeagues((prev) => {
      // Preserve any in-session additions.
      const next = { ...prev };
      for (const [sport, pins] of Object.entries(bySport)) {
        const existing = next[sport] || [];
        const existingIds = new Set(existing.map((p) => p.leagueApiId));
        const merged = [...existing];
        for (const p of pins) {
          if (!existingIds.has(p.leagueApiId)) merged.push(p);
        }
        next[sport] = merged;
      }
      return next;
    });
  }, [user?.favoriteTeams]);

  // Per-sport totals for the SportTabBar badges.
  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of selected.values()) {
      counts[entry.sport] = (counts[entry.sport] ?? 0) + 1;
    }
    return counts;
  }, [selected]);

  const selectedKeys = useMemo(() => new Set(selected.keys()), [selected]);

  // Fetch a league's full team list on demand — only once per
  // `sport:leagueApiId`. Also used to enrich the stored pin with a
  // proper logo/name after the first fetch.
  const fetchLeagueTeams = useCallback(
    async (sport: string, leagueApiId: number) => {
      if (!tokens?.accessToken) return;
      const key = `${sport}:${leagueApiId}`;
      if (teamsByLeague.has(key)) return;
      if (sectionLoading.has(key)) return;
      setSectionLoading((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      try {
        const res = await sportsApi.getPopularTeams(tokens.accessToken, sport as SportKey, {
          page: 1,
          limit: 500,
          leagueIds: [leagueApiId],
        });
        setTeamsByLeague((prev) => {
          const next = new Map(prev);
          next.set(key, res.teams || []);
          return next;
        });
        // If the first team has a leagueName, propagate it to the pin.
        const name = res.teams?.[0]?.leagueName;
        if (name) {
          setPinnedLeagues((prev) => {
            const list = prev[sport] || [];
            const updated = list.map((p) =>
              p.leagueApiId === leagueApiId && (!p.name || p.name.startsWith('League #'))
                ? { ...p, name }
                : p,
            );
            return { ...prev, [sport]: updated };
          });
        }
      } catch {
        setTeamsByLeague((prev) => {
          const next = new Map(prev);
          next.set(key, []);
          return next;
        });
      } finally {
        setSectionLoading((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [tokens?.accessToken, teamsByLeague, sectionLoading],
  );

  // Auto-fetch every pinned league's teams once we know about it.
  useEffect(() => {
    const forSport = pinnedLeagues[activeSport] || [];
    for (const p of forSport) {
      fetchLeagueTeams(activeSport, p.leagueApiId);
    }
  }, [activeSport, pinnedLeagues, fetchLeagueTeams]);

  // Fetch the active sport's leagues list so we can enrich pin metadata
  // (the logo especially — `getPopularTeams` doesn't return it). Runs
  // once per sport the user actually visits.
  useEffect(() => {
    if (!tokens?.accessToken) return;
    if (leaguesBySport[activeSport]) return;
    let cancelled = false;
    sportsApi
      .getLeagues(tokens.accessToken, activeSport as SportKey)
      .then((res) => {
        if (cancelled) return;
        setLeaguesBySport((prev) => ({ ...prev, [activeSport]: res || [] }));
      })
      .catch(() => {
        if (cancelled) return;
        setLeaguesBySport((prev) => ({ ...prev, [activeSport]: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [activeSport, tokens?.accessToken, leaguesBySport]);

  // Enrich pins with the logo/name from the leagues cache when it
  // arrives. Only mutates pins that are still missing data so re-runs
  // here are no-ops once everything is hydrated.
  useEffect(() => {
    const cache = leaguesBySport[activeSport];
    if (!cache || cache.length === 0) return;
    setPinnedLeagues((prev) => {
      const list = prev[activeSport] || [];
      if (list.length === 0) return prev;
      let changed = false;
      const byId = new Map(cache.map((l) => [l.apiId, l]));
      const next = list.map((p) => {
        const meta = byId.get(p.leagueApiId);
        if (!meta) return p;
        const needsLogo = !p.logo && !!meta.logo;
        const needsName = (!p.name || p.name.startsWith('League #')) && !!meta.name;
        if (!needsLogo && !needsName) return p;
        changed = true;
        return {
          ...p,
          logo: p.logo || meta.logo,
          name: needsName ? meta.name : p.name,
        };
      });
      if (!changed) return prev;
      return { ...prev, [activeSport]: next };
    });
  }, [activeSport, leaguesBySport]);

  // ─── Actions ───────────────────────────────────────────

  const toggleTeam = useCallback(
    (sport: string, team: PopularTeam) => {
      setSelected((prev) => {
        const next = new Map(prev);
        const key = teamKey(sport, team.apiId);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, {
            sport,
            teamApiId: team.apiId,
            teamName: team.name,
            teamLogo: team.logo ?? undefined,
            leagueApiId: team.leagueApiId ?? undefined,
            leagueName: team.leagueName ?? undefined,
          });
        }
        return next;
      });
    },
    [],
  );

  const selectAllInLeague = useCallback((sport: string, teams: PopularTeam[]) => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const team of teams) {
        const key = teamKey(sport, team.apiId);
        if (!next.has(key)) {
          next.set(key, {
            sport,
            teamApiId: team.apiId,
            teamName: team.name,
            teamLogo: team.logo ?? undefined,
            leagueApiId: team.leagueApiId ?? undefined,
            leagueName: team.leagueName ?? undefined,
          });
        }
      }
      return next;
    });
  }, []);

  const deselectAllInLeague = useCallback((sport: string, teams: PopularTeam[]) => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const team of teams) next.delete(teamKey(sport, team.apiId));
      return next;
    });
  }, []);

  const handleAddLeague = useCallback(
    (league: SportLeague) => {
      setPinnedLeagues((prev) => {
        const list = prev[activeSport] || [];
        if (list.some((p) => p.leagueApiId === league.apiId)) return prev;
        return {
          ...prev,
          [activeSport]: [
            ...list,
            {
              leagueApiId: league.apiId,
              name: league.name,
              logo: league.logo,
            },
          ],
        };
      });
      // If the user had previously hidden it, un-hide.
      setHiddenLeagues((prev) => {
        const set = prev[activeSport];
        if (!set || !set.has(league.apiId)) return prev;
        const next = new Set(set);
        next.delete(league.apiId);
        return { ...prev, [activeSport]: next };
      });
    },
    [activeSport],
  );

  const hideLeagueSection = useCallback(
    (sport: string, leagueApiId: number) => {
      setHiddenLeagues((prev) => {
        const set = new Set(prev[sport] || []);
        set.add(leagueApiId);
        return { ...prev, [sport]: set };
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setSaving(true);
    try {
      const teams = Array.from(selected.values())
        // Drop entries with missing required fields — defensive guard against
        // stale or malformed data that would cause backend DTO validation to fail.
        .filter((t) => t.teamApiId > 0 && t.teamName && t.sport)
        // Truncate logo URLs that could exceed the backend MaxLength limit.
        .map((t) => ({
          ...t,
          teamLogo: t.teamLogo && t.teamLogo.length > 2000 ? undefined : t.teamLogo,
          teamName: t.teamName.slice(0, 200),
          leagueName: t.leagueName ? t.leagueName.slice(0, 200) : t.leagueName,
        }));
      await favoriteTeamsApi.setFavoriteTeams(tokens.accessToken, teams);
      await refreshProfile();
      navigation.goBack();
    } catch {
      Alert.alert(
        t('common.error'),
        t('editFavoriteTeams.errorTeams', 'Could not save your teams. Try again.'),
      );
    } finally {
      setSaving(false);
    }
  }, [tokens?.accessToken, selected, refreshProfile, navigation, t]);

  // ─── Derived render state ──────────────────────────────

  const activePins = pinnedLeagues[activeSport] || [];
  const hiddenForSport = hiddenLeagues[activeSport] || new Set<number>();
  const visiblePins = activePins.filter((p) => !hiddenForSport.has(p.leagueApiId));
  const sportAccent = SPORT_COLORS[activeSport] || colors.primary;

  const originalKeys = useMemo(() => {
    const set = new Set<string>();
    for (const ft of user?.favoriteTeams || []) {
      set.add(teamKey(ft.sport, ft.teamApiId));
    }
    return set;
  }, [user?.favoriteTeams]);

  const hasChanges =
    selected.size !== originalKeys.size ||
    Array.from(selected.keys()).some((k) => !originalKeys.has(k));
  const canSave = hasChanges;

  const excludePickerIds = useMemo(
    () => new Set(activePins.map((p) => p.leagueApiId)),
    [activePins],
  );

  // ─── Render ────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('editFavoriteTeams.title', 'Favorite teams')}
        </Text>
        <TouchableOpacity hitSlop={12} onPress={handleSave} disabled={saving || !canSave}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtn, !canSave && { opacity: 0.3 }]}>
              {t('editFavorites.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <SportTabBar
        sports={sports}
        active={activeSport}
        onSelect={setActiveSport}
        teamCounts={teamCounts}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
      >
        {visiblePins.length > 1 && (
          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={() => {
                const anyExpanded = visiblePins.some(
                  (p) => !collapsed.has(`${activeSport}:${p.leagueApiId}`),
                );
                if (anyExpanded) collapseAll(activeSport);
                else expandAll(activeSport);
              }}
              style={styles.toolbarBtn}
              activeOpacity={0.7}
            >
              {(() => {
                const anyExpanded = visiblePins.some(
                  (p) => !collapsed.has(`${activeSport}:${p.leagueApiId}`),
                );
                return (
                  <>
                    <Feather
                      name={anyExpanded ? 'chevrons-up' : 'chevrons-down'}
                      size={14}
                      color={colors.onSurfaceDim}
                    />
                    <Text style={styles.toolbarBtnText}>
                      {anyExpanded
                        ? t('editFavoriteTeams.collapseAll', 'Collapse all')
                        : t('editFavoriteTeams.expandAll', 'Expand all')}
                    </Text>
                  </>
                );
              })()}
            </TouchableOpacity>
          </View>
        )}

        {visiblePins.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={44} color={colors.onSurfaceDim} />
            <Text style={styles.emptyTitle}>
              {t('editFavoriteTeams.emptyTitle', 'No teams for this sport yet')}
            </Text>
            <Text style={styles.emptyBody}>
              {t(
                'editFavoriteTeams.emptyBody',
                'Pick a league to browse and add its teams.',
              )}
            </Text>
          </View>
        ) : (
          visiblePins.map((pin) => {
            const key = `${activeSport}:${pin.leagueApiId}`;
            const teams = teamsByLeague.get(key) || [];
            const loading = sectionLoading.has(key);
            const isExpanded = !collapsed.has(key);
            return (
              <LeagueSection
                key={key}
                sport={activeSport}
                accent={sportAccent}
                leagueApiId={pin.leagueApiId}
                leagueName={pin.name}
                leagueLogo={pin.logo}
                teams={teams}
                loading={loading}
                expanded={isExpanded}
                onToggleExpand={() =>
                  toggleSectionCollapsed(activeSport, pin.leagueApiId)
                }
                selectedKeys={selectedKeys}
                onToggleTeam={toggleTeam}
                onSelectAll={selectAllInLeague}
                onDeselectAll={deselectAllInLeague}
                onRemoveSection={() => hideLeagueSection(activeSport, pin.leagueApiId)}
              />
            );
          })
        )}

        <TouchableOpacity
          style={styles.addLeagueBtn}
          activeOpacity={0.7}
          onPress={() => setAddLeagueOpen(true)}
        >
          <Feather name="plus-circle" size={18} color={colors.primary} />
          <Text style={styles.addLeagueText}>
            {t('editFavoriteTeams.addAnotherLeague', 'Add teams from another league')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <AddLeagueModal
        visible={addLeagueOpen}
        onClose={() => setAddLeagueOpen(false)}
        sport={activeSport}
        onPick={handleAddLeague}
        excludeIds={excludePickerIds}
      />
    </View>
  );
}

// ─── Types ───────────────────────────────────────────────

interface LeaguePin {
  leagueApiId: number;
  name: string;
  logo?: string;
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurface,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  saveBtn: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
    letterSpacing: 1,
  },

  // Sport tabs (match Leagues editor)
  sportTabRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },
  sportTabScroll: {
    paddingHorizontal: 16,
  },
  sportTab: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sportTabText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_500Medium',
    color: colors.onSurfaceDim,
  },
  sportTabCount: {
    fontSize: 11,
    color: colors.onSurfaceDim,
    fontFamily: 'SpaceGrotesk_500Medium',
  },

  // Toolbar — small row above the first section with the Expand/Collapse
  // all affordance. Only rendered when there's more than one visible
  // section (otherwise the affordance is noise).
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outline,
  },
  toolbarBtnText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurfaceDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // League section — matches the grouping style used elsewhere: flat
  // (no wrapping card), with a subtle divider between sections. The
  // cards inside carry the visual weight so the section doesn't compete.
  leagueSection: {
    marginTop: 20,
    paddingBottom: 8,
  },
  leagueSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SECTION_INSET,
    paddingBottom: 12,
    gap: 10,
  },
  leagueHeaderChevron: {
    marginRight: 2,
  },
  leagueHeaderLogo: {
    width: 28,
    height: 28,
  },
  leagueHeaderLogoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
  },
  leagueHeaderText: { flex: 1 },
  leagueHeaderName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurface,
    letterSpacing: 0.3,
  },
  leagueHeaderCount: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurfaceDim,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  selectAllText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  removeSectionBtn: {
    marginLeft: 4,
    padding: 4,
  },
  sectionLoading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  sectionEmpty: {
    fontSize: 12,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: SECTION_INSET,
  },

  // Team grid — identical card geometry as TeamSelectionScreen so a user
  // flipping between onboarding and profile editor gets the same look.
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_H_PADDING,
    gap: CARD_GAP,
  },
  teamCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 8,
  },
  teamCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  teamLogoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  teamName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'center',
  },
  teamCountry: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },

  // Add league CTA
  addLeagueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceVariant,
  },
  addLeagueText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurface,
    marginTop: 6,
  },
  emptyBody: {
    fontSize: 12,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outline,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 13,
    padding: 0,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  modalLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },
  modalLeagueLogo: {
    width: 28,
    height: 28,
  },
  modalLeagueName: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurface,
  },
  modalLeagueCountry: {
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 2,
  },
  modalEmpty: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 30,
    color: colors.onSurfaceDim,
  },
});

export default EditFavoriteTeamsScreen;
