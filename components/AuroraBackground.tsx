import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * Soft, oversized color blobs used behind screens for the Aurora Glass look.
 * Purely decorative: rendered absolutely and ignores touches. Uses a CSS
 * blur filter (supported on web/react-native-web) so the color bleeds into
 * a soft glow rather than a flat circle.
 */
export default function AuroraBackground() {
  // The blobs were drawn for a phone-sized screen. On a bigger window (tablet, desktop) they are
  // scaled up with the screen area so the colour still spreads across it instead of staying as
  // small smudges in the corners. Phone-sized windows, portrait or landscape, are unchanged
  // (scale 1), and the scale follows the window as it is resized or rotated.
  const { width, height } = useWindowDimensions();
  const scale = Math.max(1, Math.sqrt((width * height) / (375 * 812)));
  const sized = (base: number) => base * scale;

  return (
    // overflow hidden: the blobs reach past the screen edge on purpose, but must never make the
    // page wider than the screen (a phone would then zoom out or allow sideways panning).
    <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]} pointerEvents="none">
      <View
        style={[
          styles.blob,
          styles.violet,
          { top: sized(-120), left: sized(-100), width: sized(320), height: sized(320) },
          blurStyle(70 * Math.min(scale, 2.2)),
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.coral,
          { top: sized(-60), right: sized(-120), width: sized(300), height: sized(300) },
          blurStyle(70 * Math.min(scale, 2.2)),
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.teal,
          { top: sized(120), left: sized(60), width: sized(260), height: sized(260) },
          blurStyle(75 * Math.min(scale, 2.2)),
        ]}
      />
    </View>
  );
}

function blurStyle(px: number) {
  return { filter: `blur(${px}px)` } as any;
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  violet: {
    backgroundColor: colors.blobViolet,
    opacity: 0.55,
  },
  coral: {
    backgroundColor: colors.blobCoral,
    opacity: 0.5,
  },
  teal: {
    backgroundColor: colors.blobTeal,
    opacity: 0.45,
  },
});
