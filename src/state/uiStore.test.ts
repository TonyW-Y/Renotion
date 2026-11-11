import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore, ZOOM_MAX, ZOOM_MIN } from './uiStore';

const initial = useUiStore.getState();

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState(initial, true);
  });

  it('starts on the select tool in 2D', () => {
    expect(useUiStore.getState().tool).toBe('select');
    expect(useUiStore.getState().viewMode).toBe('2d');
  });

  it('switches tools and view modes', () => {
    useUiStore.getState().setTool('wall');
    useUiStore.getState().setViewMode('split');
    expect(useUiStore.getState().tool).toBe('wall');
    expect(useUiStore.getState().viewMode).toBe('split');
  });

  it('toggles theme', () => {
    useUiStore.getState().setTheme('dark');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('light');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('clamps zoom to its limits', () => {
    useUiStore.getState().setZoom(100);
    expect(useUiStore.getState().zoom).toBe(ZOOM_MAX);
    useUiStore.getState().zoomBy(0.0001);
    expect(useUiStore.getState().zoom).toBe(ZOOM_MIN);
  });

  it('zooms around a screen point', () => {
    // Zoom 2× around (100, 0): the point under the cursor must stay put.
    useUiStore.getState().zoomAt(2, { x: 100, y: 0 });
    const { zoom, pan } = useUiStore.getState();
    expect(zoom).toBe(2);
    expect(pan).toEqual({ x: -100, y: 0 });
  });

  it('clears the selection when leaving the select tool', () => {
    useUiStore.getState().select({ kind: 'wall', id: 'w1' });
    useUiStore.getState().setTool('wall');
    expect(useUiStore.getState().selection).toBeNull();
  });

  it('toggles the properties panel', () => {
    const open = useUiStore.getState().rightPanelOpen;
    useUiStore.getState().toggleRightPanel();
    expect(useUiStore.getState().rightPanelOpen).toBe(!open);
  });
});
