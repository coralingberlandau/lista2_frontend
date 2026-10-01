import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

const DOT_COLORS = [colors.blobViolet, colors.blobCoral, colors.blobTeal] as const;

/**
 * Three dots in the Aurora brand colors, bouncing in a staggered loop.
 * Used wherever the app previously showed a plain "Loading…" text.
 */
export default function AuroraDotsLoader() {
  const bounce = useRef(DOT_COLORS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = bounce.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(1200 - index * 150 - 600 > 0 ? 1200 - index * 150 - 600 : 0),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [bounce]);

  return (
    <View style={styles.row}>
      {bounce.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: DOT_COLORS[index],
              opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
              transform: [
                {
                  translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
