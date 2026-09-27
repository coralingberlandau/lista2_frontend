import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radii, shadows } from '@/constants/theme';

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  tint?: string;
};

/**
 * Frosted-glass card: a real blurred, semi-transparent surface over the
 * AuroraBackground blobs, with a plain translucent fallback on platforms
 * where backdrop blur isn't supported.
 */
export default function GlassCard({
  children,
  style,
  contentStyle,
  radius = radii.xl,
  tint = colors.glassBg,
}: GlassCardProps) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder }, shadows.soft, style]}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: tint }]} />
      <View style={contentStyle}>{children}</View>
    </View>
  );
}
