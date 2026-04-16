import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { SPORT_TABS } from '../api/sports';
import type { SportKey } from '../api/sports';

interface SportTabsProps {
  activeSport: SportKey;
  onSportChange: (sport: SportKey) => void;
  /**
   * List of sport keys the user follows (typically `user.favoriteSports`).
   *
   * - `undefined` → "unfiltered" caller (e.g. LiveScreen), show every sport.
   * - `[]` or a populated array → "filtered" caller that wants to strictly
   *   respect the user's preferences. In that case we fall back to the
   *   free sport (`football`) instead of showing every tab, so a user who
   *   only picked soccer doesn't see basketball/hockey/etc. in the Home
   *   or Coin Leagues tabs.
   */
  visibleSports?: string[];
}

export function SportTabs({ activeSport, onSportChange, visibleSports }: SportTabsProps) {
  const { t } = useTranslation();
  const tabs = useMemo(() => {
    // Unfiltered caller — show everything.
    if (visibleSports === undefined) return SPORT_TABS;
    // Filtered caller with no favorites yet — default to the free sport
    // instead of reverting to the full list. Matches EditFavoriteTeams.
    const effective = visibleSports.length === 0 ? ['football'] : visibleSports;
    return SPORT_TABS.filter((t) => effective.includes(t.key));
  }, [visibleSports]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => {
        const isActive = activeSport === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSportChange(tab.key)}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t(`sportNames.${tab.key}`, { defaultValue: tab.name })}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 44, marginBottom: 4 },
  content: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
  },
  tabActive: { backgroundColor: colors.primary },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  labelActive: { color: '#4A5E00' },
});
