import React, { useCallback, useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import AuroraBackground from './AuroraBackground';
import { backgroundImageSources } from '@/constants/backgroundImages';
import {
  CUSTOM_BACKGROUND_ID,
  CUSTOM_BACKGROUND_URI_KEY,
  getGradientById,
} from '@/constants/gradientBackgrounds';

type AppBackgroundProps = {
  /**
   * Lets a screen show a newly picked background immediately, before the
   * async save round-trip finishes. Falls back to the saved value otherwise.
   */
  overrideId?: number | null;
  /** Same idea as overrideId, for a freshly picked custom photo's local URI. */
  overrideCustomUri?: string | null;
  /** Called once the background is ready to be seen (a photo has finished loading). */
  onReady?: () => void;
};

const FROSTED_WASH = [
  'rgba(251,249,246,0.62)',
  'rgba(251,249,246,0.48)',
  'rgba(251,249,246,0.48)',
  'rgba(251,249,246,0.58)',
] as const;

/**
 * The app-wide background: the AuroraBackground blobs by default, or the
 * user's chosen photo / gradient / custom upload once they customize it in
 * Settings. Reads the saved choice on every focus so it stays in sync across
 * Home, Settings, and the list screens without a global store.
 */
export default function AppBackground({ overrideId, overrideCustomUri, onReady }: AppBackgroundProps) {
  const [storedId, setStoredId] = useState<number | null>(null);
  const [storedCustomUri, setStoredCustomUri] = useState<string | null>(null);
  // Until the saved choice has been read, nothing is drawn (instead of the default blobs that would
  // then be swapped for the real photo).
  const [choiceRead, setChoiceRead] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        AsyncStorage.getItem('customizations'),
        AsyncStorage.getItem(CUSTOM_BACKGROUND_URI_KEY),
      ])
        .then(([value, uri]) => {
          if (cancelled) return;
          const parsed = value ? parseInt(value, 10) : NaN;
          setStoredId(Number.isFinite(parsed) ? parsed : null);
          setStoredCustomUri(uri);
          setChoiceRead(true);
        })
        .catch(() => {
          if (!cancelled) setChoiceRead(true);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const activeId = overrideId ?? storedId;
  const activeCustomUri = overrideCustomUri ?? storedCustomUri;
  const choiceKnown = choiceRead || overrideId !== undefined;

  // Gradients and the default blobs need no download, so they are ready at once.
  const isPhoto =
    (activeId === CUSTOM_BACKGROUND_ID && !!activeCustomUri) ||
    (!!activeId && !getGradientById(activeId) && activeId >= 1 && activeId <= backgroundImageSources.length);
  useEffect(() => {
    if (choiceKnown && !isPhoto) onReady?.();
  }, [choiceKnown, isPhoto, onReady]);

  if (!choiceKnown) return null;

  if (activeId === CUSTOM_BACKGROUND_ID && activeCustomUri) {
    return (
      <PhotoBackground source={{ uri: activeCustomUri }} onReady={onReady} />
    );
  }

  const gradient = activeId ? getGradientById(activeId) : null;
  if (gradient) {
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    );
  }

  const image =
    activeId && activeId >= 1 && activeId <= backgroundImageSources.length
      ? backgroundImageSources[activeId - 1]
      : null;

  if (!image) {
    return <AuroraBackground />;
  }

  return <PhotoBackground source={image} onReady={onReady} />;
}

function PhotoBackground({ source, onReady }: { source: any; onReady?: () => void }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <ImageBackground
        source={source}
        onLoad={onReady}
        onError={onReady}
        style={[StyleSheet.absoluteFillObject, styles.stretch]}
        resizeMode="cover"
      >
        {/* Light frosted wash, not a dark vignette: keeps the app's existing
            dark-text-on-light look legible on any photo (bright or dark)
            and stays consistent with the glass-card aesthetic used elsewhere. */}
        <LinearGradient
          colors={FROSTED_WASH}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  // Without an explicit width/height, react-native-web sizes the image's
  // container to the source photo's own natural pixel dimensions instead of
  // stretching to fill absoluteFillObject's inset (0/0/0/0) box, leaving the
  // background short of the edges on wide/resized viewports.
  stretch: {
    width: '100%',
    height: '100%',
  },
});
