import { describe, expect, it } from 'vitest';
import { FURNITURE, FURNITURE_BY_ID, FURNITURE_CATEGORIES } from './catalog';

describe('furniture catalogue', () => {
  it('has at least 25 uniquely identified models in known categories', () => {
    expect(FURNITURE.length).toBeGreaterThanOrEqual(25);
    expect(FURNITURE_BY_ID.size).toBe(FURNITURE.length);
    for (const m of FURNITURE) expect(FURNITURE_CATEGORIES).toContain(m.category);
  });

  it('keeps every part inside its footprint and height', () => {
    const eps = 1e-6;
    for (const m of FURNITURE) {
      for (const p of m.parts) {
        const [w, h, d] = p.size;
        const [x, y, z] = p.position;
        expect(Math.abs(x) + w / 2, `${m.id} x`).toBeLessThanOrEqual(m.width / 2 + eps);
        expect(Math.abs(z) + d / 2, `${m.id} z`).toBeLessThanOrEqual(m.depth / 2 + eps);
        expect(y - h / 2, `${m.id} floor`).toBeGreaterThanOrEqual(-eps);
        expect(y + h / 2, `${m.id} top`).toBeLessThanOrEqual(m.height + 0.05);
      }
    }
  });
});
