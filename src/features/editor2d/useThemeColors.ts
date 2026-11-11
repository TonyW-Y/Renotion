import { useEffect, useState } from 'react';
import { useUiStore } from '@/state/uiStore';

export interface CanvasColors {
  canvas: string;
  wall: string;
  room: string;
  accent: string;
  accent2: string;
  accentSoft: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  surface: string;
  border: string;
  danger: string;
}

const VARS: Record<keyof CanvasColors, string> = {
  canvas: '--canvas',
  wall: '--wall',
  room: '--room',
  accent: '--accent',
  accent2: '--accent-2',
  accentSoft: '--accent-soft',
  fg: '--fg',
  fgMuted: '--fg-muted',
  fgSubtle: '--fg-subtle',
  surface: '--surface',
  border: '--border-strong',
  danger: '--danger',
};

function read(): CanvasColors {
  const style = getComputedStyle(document.documentElement);
  const out = {} as CanvasColors;
  for (const [k, v] of Object.entries(VARS) as [keyof CanvasColors, string][]) {
    out[k] = style.getPropertyValue(v).trim() || '#888';
  }
  return out;
}

/** Resolves design tokens to concrete colors for canvas drawing; updates with the theme. */
export function useThemeColors(): CanvasColors {
  const theme = useUiStore((s) => s.theme);
  const [colors, setColors] = useState(read);
  useEffect(() => {
    // ThemeSync writes data-theme in an effect; read on the next frame.
    const id = requestAnimationFrame(() => {
      setColors(read());
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [theme]);
  return colors;
}
