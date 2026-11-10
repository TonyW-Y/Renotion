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

  it('toggles the properties panel', () => {
    const open = useUiStore.getState().rightPanelOpen;
    useUiStore.getState().toggleRightPanel();
    expect(useUiStore.getState().rightPanelOpen).toBe(!open);
  });
});
