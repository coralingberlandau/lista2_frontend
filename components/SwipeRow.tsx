import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts } from '@/constants/theme';

const OPEN_WIDTH = 96;

type SwipeRowProps = {
  /** Only people who may edit the list get the Delete button at all. */
  enabled: boolean;
  /** Temporarily ignore swipes (for example while a row is being dragged to a new place). */
  paused?: boolean;
  /** Whether this row is showing its red Delete button (the screen keeps one row open at a time). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  children: React.ReactNode;
};

/**
 * A row that slides to the left to reveal a red Delete button.
 *
 * It works the same everywhere: a finger swipe on a phone, a mouse drag on a computer (when the drag
 * does not start inside the text, where it would select text instead), and a two-finger sideways
 * swipe on a trackpad. Only a mostly sideways movement opens the row, so scrolling the page up
 * and down is never affected. The Delete button sits just outside the row and moves with it.
 */
export default function SwipeRow({ enabled, paused = false, open, onOpenChange, onDelete, children }: SwipeRowProps) {
  const x = useRef(new Animated.Value(0)).current;
  const resting = useRef(0);
  const startedInTextWithMouse = useRef(false);
  const wrapRef = useRef<View>(null);
  const latest = useRef({ enabled: enabled && !paused, open, onOpenChange });
  latest.current = { enabled: enabled && !paused, open, onOpenChange };

  const settle = (to: number) => {
    resting.current = to;
    Animated.spring(x, { toValue: to, useNativeDriver: false, speed: 22, bounciness: 0 }).start();
  };

  useEffect(() => {
    settle(open ? -OPEN_WIDTH : 0);
  }, [open]);

  const responder = useRef(
    PanResponder.create({
      // Remembers where a drag began; it never claims the touch itself. A mouse drag that starts inside
      // the text would only select text, and one that starts on the drag handle moves the row up or down.
      onStartShouldSetPanResponderCapture: (event) => {
        const native: any = event.nativeEvent;
        const type = String(native?.type || '');
        const target: any = event.target;
        const tag = String(target?.tagName || '').toUpperCase();
        const fromMouse = type.startsWith('mouse') || native?.pointerType === 'mouse';
        const onHandle = !!(target && target.closest && target.closest('[data-lista-grip]'));
        startedInTextWithMouse.current = (fromMouse && (tag === 'INPUT' || tag === 'TEXTAREA')) || onHandle;
        return false;
      },
      // Watches for a mostly sideways movement before the row's own buttons (photo, checkbox) can take over.
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        latest.current.enabled &&
        !startedInTextWithMouse.current &&
        Math.abs(gesture.dx) > 12 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gesture) => {
        x.setValue(Math.min(0, Math.max(-OPEN_WIDTH - 24, resting.current + gesture.dx)));
      },
      onPanResponderRelease: (_event, gesture) => {
        const shouldOpen = resting.current + gesture.dx < -OPEN_WIDTH / 2;
        if (shouldOpen !== latest.current.open) latest.current.onOpenChange(shouldOpen);
        else settle(shouldOpen ? -OPEN_WIDTH : 0);
      },
      onPanResponderTerminate: () => settle(latest.current.open ? -OPEN_WIDTH : 0),
    })
  ).current;

  // Two-finger sideways swipe on a trackpad (web only). A normal "wheel" listener is needed so the
  // browser's own sideways gesture (go back / forward) can be stopped.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const element: any = wrapRef.current;
    if (!element || !element.addEventListener) return;
    let travelled = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (event: WheelEvent) => {
      if (!latest.current.enabled) return;
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      travelled = Math.min(0, Math.max(-OPEN_WIDTH - 24, (travelled || resting.current) - event.deltaX));
      x.setValue(travelled);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const shouldOpen = travelled < -OPEN_WIDTH / 2;
        travelled = 0;
        if (shouldOpen !== latest.current.open) latest.current.onOpenChange(shouldOpen);
        else settle(shouldOpen ? -OPEN_WIDTH : 0);
      }, 140);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', onWheel);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <View
      ref={wrapRef}
      style={[styles.wrap, Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as any) : null]}
    >
      <Animated.View style={[styles.slider, { transform: [{ translateX: x }] }]} {...responder.panHandlers}>
        {children}
        {enabled && (
        <View style={styles.deletePanel} pointerEvents={open ? 'auto' : 'none'} {...({ 'aria-hidden': !open } as any)}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete item"
            disabled={!open}
          >
            <Feather name="trash-2" size={18} color="#fff" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
  slider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletePanel: {
    position: 'absolute',
    left: '100%',
    top: 0,
    bottom: 0,
    width: OPEN_WIDTH,
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.danger,
  },
  deleteText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
});
