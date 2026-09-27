import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radii, shadows } from '@/constants/theme';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's primary call-to-action button: a gradient pill.
 * Drop-in visual replacement for RN's plain <Button>, same onPress/disabled contract.
 */
export default function PrimaryButton({ title, onPress, disabled, loading, style }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.shadowWrap, isDisabled && styles.disabledShadow, style]}
    >
      <LinearGradient
        colors={isDisabled ? ['#C9C4E8', '#B9B2DE'] : [colors.primary, colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: radii.pill,
    ...shadows.glow,
  },
  disabledShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  button: {
    paddingVertical: 15,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
