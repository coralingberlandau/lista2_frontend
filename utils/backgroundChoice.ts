import AsyncStorage from '@react-native-async-storage/async-storage';
import { CUSTOM_BACKGROUND_ID, CUSTOM_BACKGROUND_URI_KEY } from '@/constants/gradientBackgrounds';

/**
 * The background the person has chosen, kept in memory so every screen hears about a change at
 * the same moment (the choice itself is saved on the device and on the server by Settings).
 * `null` means "not read yet", so nothing is drawn instead of a wrong background.
 */
export type BackgroundChoice = { id: number | null; uri: string | null };

let current: BackgroundChoice | null = null;
const listeners = new Set<() => void>();

// The picture's address only matters for the person's own photo, so a saved address next to a
// built-in choice is ignored (otherwise it would look like a change).
const normalized = (choice: BackgroundChoice): BackgroundChoice => ({
  id: choice.id,
  uri: choice.id === CUSTOM_BACKGROUND_ID ? choice.uri : null,
});

const sameChoice = (a: BackgroundChoice | null, b: BackgroundChoice | null) =>
  a === b || (!!a && !!b && a.id === b.id && a.uri === b.uri);

export function getBackgroundChoice(): BackgroundChoice | null {
  return current;
}

export function subscribeToBackgroundChoice(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tells every screen about a new choice (or forgets it with null). Does nothing when it has not changed. */
export function publishBackgroundChoice(choice: BackgroundChoice | null) {
  const next = choice ? normalized(choice) : null;
  if (sameChoice(current, next)) return;
  current = next;
  listeners.forEach((listener) => listener());
}

/** Reads the saved choice from the device (used when a screen appears or the app starts). */
export async function loadSavedBackgroundChoice() {
  try {
    const [value, uri] = await Promise.all([
      AsyncStorage.getItem('customizations'),
      AsyncStorage.getItem(CUSTOM_BACKGROUND_URI_KEY),
    ]);
    const parsed = value ? parseInt(value, 10) : NaN;
    publishBackgroundChoice({ id: Number.isFinite(parsed) ? parsed : null, uri });
  } catch {
    publishBackgroundChoice({ id: null, uri: null });
  }
}
