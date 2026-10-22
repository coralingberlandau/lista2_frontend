import { Image } from 'react-native';

/**
 * Downloads pictures ahead of time so a page can show them the moment it appears.
 * A picture that fails, or is too slow, never blocks the page for more than `maxWaitMs`.
 */
export async function preloadPictures(uris: string[], maxWaitMs = 8000): Promise<void> {
  const wanted = uris.filter((uri) => !!uri);
  if (wanted.length === 0) return;
  const downloads = Promise.all(wanted.map((uri) => Image.prefetch(uri).catch(() => false)));
  const limit = new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs));
  await Promise.race([downloads, limit]);
}
