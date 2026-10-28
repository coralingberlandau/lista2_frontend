import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppBackground from '@/components/AppBackground';
import { PageLoader, PageLoadError } from '@/components/PageLoader';
import { colors } from '@/constants/theme';

type PageGateProps = {
  /** True while the page is still fetching what it shows (lists, profile, ...). */
  loading?: boolean;
  /** When set, the page says it could not load and offers Try again, instead of waiting for ever. */
  error?: { title: string; message?: string; onRetry: () => void } | null;
  /** Anything else the page must have before it is shown (for example all of its own pictures). */
  ready?: boolean;
  /** Draw the page invisibly while it waits, so its own pictures can download. */
  preloadContent?: boolean;
  /** The longest a picture may hold the page up before the page is shown anyway. */
  maxPictureWaitMs?: number;
  children: React.ReactNode;
};

// The dots appear only when the wait is noticeable, so a page that is ready almost at once never flashes them.
const DOTS_DELAY_MS = 250;

/**
 * The one rule every page follows while it is not ready:
 *  - nothing of the page is visible, only the three Aurora dots, centered;
 *  - the dots show only if the wait is noticeable (over a quarter of a second);
 *  - the whole page, its background picture included, appears at once when everything has loaded;
 *  - a page that cannot load shows a short message and Try again, never dots that wait for ever;
 *  - a very slow picture cannot hold the page up for more than a few seconds.
 */
export default function PageGate({
  loading = false,
  error = null,
  ready = true,
  preloadContent = false,
  maxPictureWaitMs = 8000,
  children,
}: PageGateProps) {
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [gaveUpWaiting, setGaveUpWaiting] = useState(false);
  const [everShown, setEverShown] = useState(false);
  const [showDots, setShowDots] = useState(false);

  const markBackgroundReady = useCallback(() => setBackgroundReady(true), []);

  const shown = !loading && !error && ((ready && backgroundReady) || gaveUpWaiting);
  const waiting = !shown && !error;

  useEffect(() => {
    const timer = setTimeout(() => setGaveUpWaiting(true), maxPictureWaitMs);
    return () => clearTimeout(timer);
  }, [maxPictureWaitMs]);

  useEffect(() => {
    if (shown) setEverShown(true);
  }, [shown]);

  useEffect(() => {
    if (!waiting) {
      setShowDots(false);
      return;
    }
    const timer = setTimeout(() => setShowDots(true), DOTS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  // Once a page has been shown, its background stays; the first time it stays hidden until it has loaded.
  const backgroundVisible = everShown || (backgroundReady && (shown || !!error));

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, !backgroundVisible && styles.hidden]} pointerEvents="none">
        <AppBackground onReady={markBackgroundReady} />
      </View>
      {waiting && showDots ? (
        <View style={[StyleSheet.absoluteFill, styles.above]} pointerEvents="none">
          <PageLoader />
        </View>
      ) : null}
      {error ? <PageLoadError title={error.title} message={error.message} onRetry={error.onRetry} /> : null}
      {shown || (preloadContent && !error) ? (
        <View style={[styles.content, !shown && styles.hidden]} pointerEvents={shown ? 'auto' : 'none'}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  above: {
    zIndex: 5,
  },
});
