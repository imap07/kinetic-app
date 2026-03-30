import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useLiveGames } from '../contexts/LiveGamesContext';

const TAB_CONFIG: Record<string, { label: string }> = {
  Home: { label: 'HOME' },
  Live: { label: 'TODAY' },
  Leagues: { label: 'LEAGUES' },
  MyPicks: { label: 'MY PICKS' },
  Profile: { label: 'PROFILE' },
};

const INACTIVE_COLOR = 'rgba(248,249,254,0.6)';

function getTabIcon(routeName: string, focused: boolean) {
  const iconColor = focused ? colors.onPrimary : INACTIVE_COLOR;
  const size = focused ? 20 : 16;

  switch (routeName) {
    case 'Home':
      return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={iconColor} />;
    case 'Live':
      return <Ionicons name={focused ? 'today' : 'today-outline'} size={size} color={iconColor} />;
    case 'Leagues':
      return <MaterialCommunityIcons name="trophy" size={size} color={iconColor} />;
    case 'MyPicks':
      return <MaterialCommunityIcons name="ticket-confirmation" size={size} color={iconColor} />;
    case 'Profile':
      return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={iconColor} />;
    default:
      return null;
  }
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const { liveCount } = useLiveGames();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.outer, { paddingBottom: bottomPadding }]}>
        <View style={styles.topBorder} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const config = TAB_CONFIG[route.name] || { label: route.name };

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabSlot}
                onPress={onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.tabContent, isFocused && styles.tabContentActive]}>
                  <View>
                    {getTabIcon(route.name, isFocused)}
                    {route.name === 'Live' && liveCount > 0 && !isFocused && (
                      <View style={styles.liveDot} />
                    )}
                  </View>
                  <Text
                    style={[styles.label, isFocused && styles.labelActive]}
                    numberOfLines={1}
                  >
                    {config.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
  },
  outer: {
    backgroundColor: 'rgba(11,14,17,0.95)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(248,249,254,0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  tabContentActive: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 9,
    color: INACTIVE_COLOR,
    marginTop: 2,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.onPrimary,
  },
  liveDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: 'rgba(11,14,17,0.95)',
  },
});
