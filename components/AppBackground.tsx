import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AuroraBackground from './AuroraBackground';
import { backgroundImageSources } from '@/constants/backgroundImages';
import { CUSTOM_BACKGROUND_ID, getGradientById } from '@/constants/gradientBackgrounds';
import {
  BackgroundChoice,
  getBackgroundChoice,
  loadSavedBackgroundChoice,
  subscribeToBackgroundChoice,
} from '@/utils/backgroundChoice';

type AppBackgroundProps = {
  /** Called once the first background is ready to be seen (a photo has finished loading). */
  onReady?: () => void;
};

const FROSTED_WASH = [
  'rgba(251,249,246,0.62)',
  'rgba(251,249,246,0.48)',
  'rgba(251,249,246,0.48)',
  'rgba(251,249,246,0.58)',
] as const;

/**
 * The app-wide background: the AuroraBackground blobs by default, or the user's chosen photo /
 * gradient / custom upload once they customize it in Settings.
 *
 * Every screen shows the same choice and hears about a change at the same moment (see
 * utils/backgroundChoice.ts). A newly chosen photo loads out of sight, and the old background
 * stays on screen until the new one is complete, then they swap in one go, so a screen never
 * shows a blank or half-painted background.
 */
export default function AppBackground({ onReady }: AppBackgroundProps) {
  const wanted = useSyncExternalStore(subscribeToBackgroundChoice, getBackgroundChoice);
  // What is on screen now, and (until it has loaded) what it is being changed to.
  const [shown, setShown] = useState<BackgroundChoice | null>(null);

  // Reads the saved choice whenever a screen appears, so it stays right after logging in.
  useFocusEffect(
    useCallback(() => {
      loadSavedBackgroundChoice();
    }, [])
  );

  const display = shown ?? wanted;
  const pending = shown && wanted && !isSameChoice(shown, wanted) ? wanted : null;

  useEffect(() => {
    if (!shown && wanted) setShown(wanted);
  }, [shown, wanted]);

  const showPending = useCallback(() => {
    if (pending) setShown(pending);
  }, [pending]);

  // Gradients and the default blobs need no download, so they are ready at once.
  const displayIsPhoto = !!display && isPhotoChoice(display);
  useEffect(() => {
    if (display && !displayIsPhoto) onReady?.();
  }, [display, displayIsPhoto, onReady]);

  if (!display) return null;

  // The layers are kept in one keyed list, so the new background that has just finished loading
  // keeps being the same picture on screen when it takes over: no reload, no blank moment.
  const layers = [
    { choice: display, visible: true },
    ...(pending ? [{ choice: pending, visible: false }] : []),
  ];

  return (
    <>
      {layers.map(({ choice, visible }) => (
        <View
          key={`${choice.id}:${choice.uri ?? ''}`}
          style={[StyleSheet.absoluteFillObject, !visible && styles.hidden]}
          pointerEvents="none"
        >
          <BackgroundLayer choice={choice} onReady={visible ? onReady : showPending} readyWhenNotPhoto={!visible} />
        </View>
      ))}
    </>
  );
}

// (The store already ignores the picture address for built-in choices, so comparing both is enough.)
const isSameChoice = (a: BackgroundChoice, b: BackgroundChoice) => a.id === b.id && a.uri === b.uri;

function isPhotoChoice(choice: BackgroundChoice) {
  if (choice.id === CUSTOM_BACKGROUND_ID && choice.uri) return true;
  return (
    !!choice.id && !getGradientById(choice.id) && choice.id >= 1 && choice.id <= backgroundImageSources.length
  );
}

/** One background, drawn as a photo, a gradient or the default blobs. */
function BackgroundLayer({
  choice,
  onReady,
  readyWhenNotPhoto = false,
}: {
  choice: BackgroundChoice;
  onReady?: () => void;
  /** For the hidden layer: say "ready" at once when there is nothing to download. */
  readyWhenNotPhoto?: boolean;
}) {
  const isPhoto = isPhotoChoice(choice);
  useEffect(() => {
    if (readyWhenNotPhoto && !isPhoto) onReady?.();
  }, [readyWhenNotPhoto, isPhoto, onReady]);

  if (choice.id === CUSTOM_BACKGROUND_ID && choice.uri) {
    return <PhotoBackground source={{ uri: choice.uri }} onReady={onReady} />;
  }

  const gradient = choice.id ? getGradientById(choice.id) : null;
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
    choice.id && choice.id >= 1 && choice.id <= backgroundImageSources.length
      ? backgroundImageSources[choice.id - 1]
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
  hidden: {
    opacity: 0,
  },
  // Without an explicit width/height, react-native-web sizes the image's
  // container to the source photo's own natural pixel dimensions instead of
  // stretching to fill absoluteFillObject's inset (0/0/0/0) box, leaving the
  // background short of the edges on wide/resized viewports.
  stretch: {
    width: '100%',
    height: '100%',
  },
});
