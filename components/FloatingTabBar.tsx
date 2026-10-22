import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '@/constants/theme';

/**
 * The bottom navigation: a floating white pill with the Home and Settings tabs. The active tab
 * has a soft violet-to-pink highlight. It replaces the full-width white strip.
 * Only the tabs that have an icon (Home, Settings) are shown; the other screens are reached from
 * inside the app.
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (!options.tabBarIcon) return null;
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.placeholder;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={focused ? { selected: true } : {}}
              activeOpacity={0.8}
              onPress={onPress}
              style={styles.tab}
            >
              {focused && (
                <LinearGradient
                  colors={['rgba(106,91,214,0.16)', 'rgba(255,158,176,0.22)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              {options.tabBarIcon({ focused, color, size: 24 })}
              <Text style={[styles.label, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: 236,
    height: 68,
    borderRadius: 34,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...Platform.select({
      web: { boxShadow: '0 14px 32px rgba(91,79,233,0.24)' } as any,
      default: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.24, shadowRadius: 20, elevation: 8 },
    }),
  },
  tab: {
    width: 102,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    marginTop: 1,
  },
});
