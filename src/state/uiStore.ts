import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Vec2 } from '@/core/types';
import type { UnitSystem } from '@/core/units';

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'delete';
export type ViewMode = '2d' | 'split' | '3d';
export type Theme = 'dark' | 'light';
export type PlanKind = 'baseline' | 'planned';

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
  /** Cursor position in plan space (metres), or null when outside the canvas. */
  cursor: Vec2 | null;
  planKind: PlanKind;
  /** Temporary home until the project store lands (Phase 1/6). */
  projectName: string;

  setTool: (tool: Tool) => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setUnits: (units: UnitSystem) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setZoom: (zoom: number) => void;
  zoomBy: (factor: number) => void;
  setCursor: (cursor: Vec2 | null) => void;
  setPlanKind: (kind: PlanKind) => void;
  setProjectName: (name: string) => void;
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
      cursor: null,
      planKind: 'baseline',
      projectName: 'Untitled project',

      setTool: (tool) => {
        set({ tool });
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
      setCursor: (cursor) => {
        set({ cursor });
      },
      setPlanKind: (planKind) => {
        set({ planKind });
      },
      setProjectName: (projectName) => {
        set({ projectName });
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
        projectName: s.projectName,
      }),
    },
  ),
);
