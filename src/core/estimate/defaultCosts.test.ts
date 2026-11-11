import { describe, expect, it } from 'vitest';
import { customPaintId, DEFAULT_MATERIALS, getMaterial, PAINTS } from './defaultCosts';

describe('default materials', () => {
  it('has unique ids and a 24-colour paint palette', () => {
    const ids = DEFAULT_MATERIALS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PAINTS).toHaveLength(24);
  });

  it('gives every textured material a tile size', () => {
    for (const m of DEFAULT_MATERIALS) if (m.textureSet) expect(m.tileSize).toBeGreaterThan(0);
  });

  it('resolves catalogue and custom paint ids', () => {
    expect(getMaterial('oak-hardwood')?.unit).toBe('sqft');
    const custom = getMaterial(customPaintId('#AABBCC'));
    expect(custom).toMatchObject({ category: 'paint', colorHex: '#aabbcc', id: 'paint:#aabbcc' });
    expect(getMaterial('nope')).toBeUndefined();
    expect(getMaterial(undefined)).toBeUndefined();
  });
});
