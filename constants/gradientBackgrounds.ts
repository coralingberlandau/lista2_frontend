import { colors } from './theme';

/**
 * Solid-gradient background options, offered in Settings alongside the photo
 * library. IDs start at 101 so they never collide with the photo ids (1-24)
 * or the sentinels used elsewhere (1000 = default, 9999 = custom upload).
 *
 * DEFAULT_BACKGROUND_ID must stay non-zero: the backend's customizations
 * endpoint treats a falsy background_image_id as "missing" and rejects it
 * with a 400, so 0 can't be used as a sentinel here.
 */
export type GradientBackground = {
  id: number;
  colors: readonly [string, string];
};

export const gradientBackgrounds: GradientBackground[] = [
  { id: 101, colors: [colors.blobViolet, colors.blobTeal] },
  { id: 102, colors: [colors.blobCoral, colors.primary] },
  { id: 103, colors: [colors.blobTeal, colors.primary] },
  { id: 104, colors: [colors.primary, colors.primaryLight] },
];

export const DEFAULT_BACKGROUND_ID = 1000;
export const CUSTOM_BACKGROUND_ID = 9999;
export const CUSTOM_BACKGROUND_URI_KEY = 'customBackgroundUri';

export function isGradientBackgroundId(id: number | null | undefined): boolean {
  return !!id && gradientBackgrounds.some((g) => g.id === id);
}

export function getGradientById(id: number): readonly [string, string] | null {
  return gradientBackgrounds.find((g) => g.id === id)?.colors ?? null;
}
