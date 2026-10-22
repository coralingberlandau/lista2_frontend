import React from 'react';
import { StyleSheet, View } from 'react-native';
import AuroraDotsLoader from '@/components/AuroraDotsLoader';
import { colors } from '@/constants/theme';

/**
 * What the app shows from the very first moment, while its fonts load and the saved login is
 * looked up: only the three Aurora dots, centered, never a blank screen. On the web the same dots
 * are already drawn by index.html before any code has loaded, so there is no gap and no jump.
 */
export default function StartupScreen() {
  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <AuroraDotsLoader size={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
