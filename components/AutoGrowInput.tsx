import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, TextInput, TextInputProps } from 'react-native';

type AutoGrowInputProps = TextInputProps & {
  /** Gives the screen the underlying field (to focus it, for example). */
  inputRef?: (input: TextInput | null) => void;
};

/**
 * A text field that wraps its text onto as many lines as it needs and grows (or shrinks) to fit,
 * so long text always stays inside its row instead of scrolling sideways inside one line.
 */
export default function AutoGrowInput({ inputRef, value, onLayout, style, ...props }: AutoGrowInputProps) {
  const field = useRef<any>(null);

  const fit = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const element = field.current;
    if (!element || !element.style) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(24, element.scrollHeight)}px`;
  }, []);

  // Refit whenever the text changes (also when another row's text has moved into this field).
  useEffect(() => {
    fit();
  }, [value, fit]);

  const setRefs = useCallback(
    (node: TextInput | null) => {
      field.current = node;
      inputRef?.(node);
      if (node) fit();
    },
    [inputRef, fit]
  );

  return (
    <TextInput
      {...props}
      ref={setRefs}
      value={value}
      multiline
      scrollEnabled={false}
      numberOfLines={1}
      style={[style, Platform.OS === 'web' ? ({ overflow: 'hidden', resize: 'none' } as any) : null]}
      // A change of the row's width (rotating the phone, resizing the window) changes the wrapping.
      onLayout={(event) => {
        fit();
        onLayout?.(event);
      }}
    />
  );
}
