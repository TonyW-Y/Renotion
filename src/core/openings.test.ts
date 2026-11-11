import { describe, expect, it } from 'vitest';
import {
  DOOR_STYLES,
  OPENING_PRESETS,
  openingMaterialId,
  openingStyleOf,
  stylesFor,
  WINDOW_STYLES,
} from './openings';
import { getMaterial } from './estimate/defaultCosts';

describe('opening styles', () => {
  it('defaults doors to slab and windows to casement', () => {
    expect(openingStyleOf({ type: 'door' })).toBe('slab');
    expect(openingStyleOf({ type: 'window' })).toBe('casement');
    expect(openingStyleOf({ type: 'door', style: 'barn' })).toBe('barn');
  });

  it('ignores a style that belongs to the other opening type', () => {
    expect(openingStyleOf({ type: 'window', style: 'barn' })).toBe('casement');
  });

  it('lists six designs for each type', () => {
    expect(DOOR_STYLES).toHaveLength(6);
    expect(WINDOW_STYLES).toHaveLength(6);
    expect(stylesFor('door')).toBe(DOOR_STYLES);
  });

  it('prices every style with its own material', () => {
    const all = [
      ...DOOR_STYLES.map((s) => ({ type: 'door' as const, s })),
      ...WINDOW_STYLES.map((s) => ({ type: 'window' as const, s })),
    ];
    for (const { type, s } of all) {
      const m = getMaterial(openingMaterialId({ type, style: s.id }));
      expect(m?.category, s.id).toBe(type);
      expect(m?.costPerUnit).toBeGreaterThan(0);
    }
    // Defaults keep the original material ids.
    expect(openingMaterialId({ type: 'door' })).toBe('interior-door');
    expect(openingMaterialId({ type: 'window' })).toBe('window-unit');
  });

  it('has a pet-door preset small enough for a dog door', () => {
    const pet = OPENING_PRESETS.door.find((p) => p.style === 'pet');
    expect(pet?.width).toBeLessThanOrEqual(0.4);
    expect(pet?.height).toBeLessThanOrEqual(0.5);
  });
});
