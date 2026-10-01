import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { fonts, radii } from '@/constants/theme';

type GradientToastProps = {
  colors: readonly [string, string];
  borderColor: string;
  textColor: string;
  text1?: string;
  text2?: string;
};

function GradientToast({ colors, borderColor, textColor, text1, text2 }: GradientToastProps) {
  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={styles.backing} />
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient} />
      {text1 ? <Text style={[styles.text1, { color: textColor }]}>{text1}</Text> : null}
      {text2 ? <Text style={[styles.text2, { color: textColor }]}>{text2}</Text> : null}
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <GradientToast
      colors={['rgba(95,217,206,0.62)', 'rgba(139,126,240,0.48)']}
      borderColor="rgba(63,174,131,0.6)"
      textColor="#1F5C42"
      text1={text1}
      text2={text2}
    />
  ),
  error: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <GradientToast
      colors={['rgba(226,83,107,0.58)', 'rgba(255,158,176,0.46)']}
      borderColor="rgba(226,83,107,0.6)"
      textColor="#601B29"
      text1={text1}
      text2={text2}
    />
  ),
};

const styles = StyleSheet.create({
  card: {
    width: '90%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  backing: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  text1: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  text2: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
});
