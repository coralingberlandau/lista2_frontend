/**
 * Aurora Glass theme tokens for the Lista app.
 * Centralizes the colors, typography and shared metrics used across screens
 * so the whole app reads as one consistent design system.
 */

export const colors = {
  background: '#FBF9F6',

  text: '#26223B',
  textMuted: '#6B6380',
  placeholder: '#9089AA',

  primary: '#6A5BD6',
  primaryDark: '#5B4FE9',
  primaryLight: '#8B6AD9',

  blobViolet: '#8B7EF0',
  blobCoral: '#FF9EB0',
  blobTeal: '#5FD9CE',

  glassBg: 'rgba(255,255,255,0.62)',
  glassBgStrong: 'rgba(255,255,255,0.82)',
  glassBorder: 'rgba(255,255,255,0.8)',

  inputBg: 'rgba(255,255,255,0.7)',
  inputBorder: 'rgba(255,255,255,0.9)',

  white: '#FFFFFF',
  divider: 'rgba(38,34,59,0.08)',

  success: '#3FAE83',
  danger: '#E2536B',

  shadow: 'rgba(91,79,233,0.16)',
};

export const gradients = {
  primary: [colors.primary, colors.primaryLight] as const,
  accent: [colors.primary, colors.blobCoral] as const,
  notStarted: [colors.blobCoral, colors.primary] as const,
  inProgress: [colors.primary, colors.blobCoral] as const,
  complete: [colors.blobTeal, colors.primary] as const,
};

/**
 * Picks a gradient for a progress indicator (badge, fill bar) based on
 * how many of `total` items are done — coral for not-started, purple for
 * in-progress, teal for complete.
 */
export function progressGradient(done: number, total: number) {
  if (total <= 0 || done <= 0) return gradients.notStarted;
  if (done >= total) return gradients.complete;
  return gradients.inProgress;
}

export const fonts = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  loraWordmark: 'Lora_600SemiBold',
  loraTagline: 'Lora_400Regular_Italic',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  bodyExtraBold: 'PlusJakartaSans_800ExtraBold',
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
};

export const shadows = {
  soft: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
};
