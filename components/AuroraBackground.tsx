import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * Soft, oversized color blobs used behind screens for the Aurora Glass look.
 * Purely decorative: rendered absolutely and ignores touches. Uses a CSS
 * blur filter (supported on web/react-native-web) so the color bleeds into
 * a soft glow rather than a flat circle.
 */
export default function AuroraBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[styles.blob, styles.violet, blurStyle(70)]} />
      <View style={[styles.blob, styles.coral, blurStyle(70)]} />
      <View style={[styles.blob, styles.teal, blurStyle(75)]} />
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
    top: -120,
    left: -100,
    width: 320,
    height: 320,
    backgroundColor: colors.blobViolet,
    opacity: 0.55,
  },
  coral: {
    top: -60,
    right: -120,
    width: 300,
    height: 300,
    backgroundColor: colors.blobCoral,
    opacity: 0.5,
  },
  teal: {
    top: 120,
    left: 60,
    width: 260,
    height: 260,
    backgroundColor: colors.blobTeal,
    opacity: 0.45,
  },
});
