import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuroraDotsLoader from '@/components/AuroraDotsLoader';
import PrimaryButton from '@/components/PrimaryButton';
import { colors, fonts } from '@/constants/theme';

/**
 * What a page shows while it is still getting what it needs: only the three Aurora dots,
 * centered on the whole page, so nobody ever sees a half-drawn page. The page itself replaces
 * it once everything has arrived.
 */
export function PageLoader() {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <AuroraDotsLoader size={16} />
    </View>
  );
}

/**
 * What a page shows when it could not get what it needs: a short message and a Try again
 * button, never dots that wait forever.
 */
export function PageLoadError({ title, message, onRetry }: { title: string; message?: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <PrimaryButton title="Try again" onPress={onRetry} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    marginTop: 22,
    minWidth: 150,
  },
});
