import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Vec2 } from '@/core/types';
import type { UnitSystem } from '@/core/units';

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'delete';
export type ViewMode = '2d' | 'split' | '3d';
export type Theme = 'dark' | 'light';
export type SelectionKind = 'wall' | 'opening' | 'room' | 'furniture';

export interface Selection {
  kind: SelectionKind;
  /** Element id, or room key for rooms. */
  id: string;
}

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const UI_STORAGE_KEY = 'renotion:ui';

const clampZoom = (z: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

function initialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export interface UiState {
  tool: Tool;
  viewMode: ViewMode;
  theme: Theme;
  units: UnitSystem;
  rightPanelOpen: boolean;
  zoom: number;
  /** Screen offset (px) of the plan origin from the canvas centre. */
  pan: Vec2;
  /** Cursor position in plan space (metres), or null when outside the canvas. */
  cursor: Vec2 | null;
  selection: Selection | null;
  hover: Selection | null;

  setTool: (tool: Tool) => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setUnits: (units: UnitSystem) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setZoom: (zoom: number) => void;
  zoomBy: (factor: number) => void;
  /** Zooms keeping the screen point `at` (px from canvas centre) fixed. */
  zoomAt: (factor: number, at: Vec2) => void;
  setPan: (pan: Vec2) => void;
  panBy: (dx: number, dy: number) => void;
  resetView: () => void;
  setCursor: (cursor: Vec2 | null) => void;
  select: (selection: Selection | null) => void;
  setHover: (hover: Selection | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      tool: 'select',
      viewMode: '2d',
      theme: initialTheme(),
      units: 'metric',
      rightPanelOpen: true,
      zoom: 1,
      pan: { x: 0, y: 0 },
      cursor: null,
      selection: null,
      hover: null,

      setTool: (tool) => {
        set((s) => ({ tool, selection: tool === 'select' ? s.selection : null }));
      },
      setViewMode: (viewMode) => {
        set({ viewMode });
      },
      setTheme: (theme) => {
        set({ theme });
      },
      toggleTheme: () => {
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }));
      },
      setUnits: (units) => {
        set({ units });
      },
      toggleRightPanel: () => {
        set((s) => ({ rightPanelOpen: !s.rightPanelOpen }));
      },
      setRightPanelOpen: (rightPanelOpen) => {
        set({ rightPanelOpen });
      },
      setZoom: (zoom) => {
        set({ zoom: clampZoom(zoom) });
      },
      zoomBy: (factor) => {
        set((s) => ({ zoom: clampZoom(s.zoom * factor) }));
      },
      zoomAt: (factor, at) => {
        set((s) => {
          const zoom = clampZoom(s.zoom * factor);
          const k = zoom / s.zoom;
          return { zoom, pan: { x: at.x - (at.x - s.pan.x) * k, y: at.y - (at.y - s.pan.y) * k } };
        });
      },
      setPan: (pan) => {
        set({ pan });
      },
      panBy: (dx, dy) => {
        set((s) => ({ pan: { x: s.pan.x + dx, y: s.pan.y + dy } }));
      },
      resetView: () => {
        set({ zoom: 1, pan: { x: 0, y: 0 } });
      },
      setCursor: (cursor) => {
        set({ cursor });
      },
      select: (selection) => {
        set({ selection });
      },
      setHover: (hover) => {
        set({ hover });
      },
    }),
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        units: s.units,
        viewMode: s.viewMode,
        rightPanelOpen: s.rightPanelOpen,
      }),
    },
  ),
);
