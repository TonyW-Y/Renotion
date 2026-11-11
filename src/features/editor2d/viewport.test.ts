import { describe, expect, it } from 'vitest';
import { boundsOf, fitView, flat, makeView, toScreen, toWorld } from './viewport';

describe('viewport', () => {
  const v = makeView(800, 600, { x: 0, y: 0 }, 1); // 80 px/m, origin at (400, 300)

  it('maps plan to screen with y flipped', () => {
    expect(toScreen({ x: 1, y: 1 }, v)).toEqual({ x: 480, y: 220 });
    expect(flat([{ x: 0, y: 0 }], v)).toEqual([400, 300]);
  });

  it('round-trips screen ↔ world', () => {
    const p = { x: 2.5, y: -1.25 };
    expect(toWorld(toScreen(p, v), v)).toEqual(p);
  });

  it('fits bounds and centres them', () => {
    const b = boundsOf([
      { x: 0, y: 0 },
      { x: 8, y: 4 },
    ]);
    if (!b) throw new Error('no bounds');
    const { zoom, pan } = fitView(b, 800, 600, 80);
    // usable 640 × 440 → min(640/8, 440/4) = 80 px/m → zoom 1
    expect(zoom).toBe(1);
    const fitted = makeView(800, 600, pan, zoom);
    expect(toScreen({ x: 4, y: 2 }, fitted)).toEqual({ x: 400, y: 300 });
  });
});
