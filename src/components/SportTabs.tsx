import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { SPORT_TABS } from '../api/sports';
import type { SportKey } from '../api/sports';

interface SportTabsProps {
  activeSport: SportKey;
  onSportChange: (sport: SportKey) => void;
  isProMember?: boolean;
  /** If provided, only show these sports (from user.favoriteSports) */
  visibleSports?: string[];
}

export function SportTabs({ activeSport, onSportChange, visibleSports }: SportTabsProps) {
  const tabs = useMemo(() => {
    if (!visibleSports || visibleSports.length === 0) return SPORT_TABS;
    return SPORT_TABS.filter((t) => visibleSports.includes(t.key));
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
              {tab.name}
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
