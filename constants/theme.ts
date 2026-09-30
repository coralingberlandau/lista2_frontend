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

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

const progressCoral = hexToRgb(colors.blobCoral);
const progressViolet = hexToRgb(colors.blobViolet);
const progressTeal = hexToRgb(colors.blobTeal);

/**
 * Picks a two-color gradient for a progress indicator (badge, fill bar)
 * that shifts continuously from coral (0%) through violet (50%) to teal
 * (100%) as `done`/`total` increases, instead of jumping between a fixed
 * set of states.
 */
export function progressGradient(done: number, total: number): readonly [string, string] {
  if (total <= 0) return gradients.notStarted;
  const ratio = Math.min(Math.max(done / total, 0), 1);
  const start = ratio <= 0.5 ? lerpColor(progressCoral, progressViolet, ratio / 0.5) : lerpColor(progressViolet, progressTeal, (ratio - 0.5) / 0.5);
  const endRatio = Math.min(ratio + 0.35, 1);
  const end = endRatio <= 0.5 ? lerpColor(progressCoral, progressViolet, endRatio / 0.5) : lerpColor(progressViolet, progressTeal, (endRatio - 0.5) / 0.5);
  return [start, end];
}

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_500Medium_Italic',
  loraWordmark: 'Fraunces_600SemiBold',
  loraTagline: 'Fraunces_500Medium_Italic',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
  bodyExtraBold: 'DMSans_800ExtraBold',
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
