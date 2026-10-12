import { Platform } from 'react-native';

/**
 * Shrinks a picture before it is uploaded.
 *
 * Why: the web photo picker returns the picture at full size (often 3 to 10 MB), and the
 * server only accepts uploads up to a limit, so big photos used to be refused. A list item
 * only needs a thumbnail and a full-screen view, so about 1280 px on the long side is plenty
 * and keeps each picture to a few hundred KB.
 *
 * How: the picture is drawn onto a canvas at the smaller size and exported as a JPEG. This
 * uses only what the browser already provides, so no extra package is needed. Small pictures
 * are left exactly as they are. On phones (not used today) the picture is returned unchanged.
 * If the picture cannot be read (for example an unsupported format) this throws, and the
 * caller shows a message instead of sending a broken file.
 */

/** Longest side, in pixels, of a shrunken picture. */
export const MAX_IMAGE_SIDE = 1280;
/** Pictures at or below this size (and at or below MAX_IMAGE_SIDE) are not touched. */
const LEAVE_ALONE_BYTES = 350 * 1024;
const JPEG_QUALITY = 0.8;
/** If the result is still bigger than this, compress once more, harder. */
const RETRY_ABOVE_BYTES = 1.5 * 1024 * 1024;
const RETRY_QUALITY = 0.6;

export interface ShrunkImage {
  uri: string;
  mimeType: string;
}

const isDataUri = (uri: string) => uri.startsWith('data:');

/** Approximate size in bytes of the file inside a base64 data address. */
const dataUriBytes = (uri: string): number => {
  const comma = uri.indexOf(',');
  return Math.floor(((uri.length - comma - 1) * 3) / 4);
};

const mimeOfDataUri = (uri: string): string => {
  const match = /^data:([^;,]+)/.exec(uri);
  return match ? match[1] : 'image/jpeg';
};

const loadImage = (uri: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The picture could not be read.'));
    img.src = uri;
  });

export async function shrinkImage(uri: string): Promise<ShrunkImage> {
  if (Platform.OS !== 'web') {
    return { uri, mimeType: 'image/jpeg' };
  }

  const img = await loadImage(uri);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) {
    throw new Error('The picture could not be read.');
  }
  const longSide = Math.max(width, height);

  // Already small: keep the original untouched (no quality loss).
  if (isDataUri(uri) && longSide <= MAX_IMAGE_SIDE && dataUriBytes(uri) <= LEAVE_ALONE_BYTES) {
    return { uri, mimeType: mimeOfDataUri(uri) };
  }

  const scale = Math.min(1, MAX_IMAGE_SIDE / longSide);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('The picture could not be processed.');
  }
  // JPEG has no transparency, so paint white first (transparent PNGs would turn black).
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  let result = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (dataUriBytes(result) > RETRY_ABOVE_BYTES) {
    result = canvas.toDataURL('image/jpeg', RETRY_QUALITY);
  }
  return { uri: result, mimeType: 'image/jpeg' };
}
