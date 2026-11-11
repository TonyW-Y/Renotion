import type { Material } from '../types';

/**
 * Seed cost table: rough 2026 retail prices in CAD for budgeting only.
 * These are NOT quotes — the UI labels them as editable estimates, and every
 * price can be overridden per project.
 */

const SQFT_PER_SQM = 10.7639;

export const FLOORING: readonly Material[] = [
  {
    id: 'oak-hardwood',
    name: 'Oak hardwood',
    category: 'flooring',
    textureSet: 'oak-hardwood',
    tileSize: 1.7,
    colorHex: '#b98a5a',
    costPerUnit: 9.5,
    unit: 'sqft',
    wasteFactor: 0.1,
  },
  {
    id: 'herringbone-oak',
    name: 'Herringbone oak',
    category: 'flooring',
    textureSet: 'herringbone-oak',
    tileSize: 3.4,
    colorHex: '#a87a4f',
    costPerUnit: 13,
    unit: 'sqft',
    wasteFactor: 0.15,
  },
  {
    id: 'walnut-planks',
    name: 'Walnut planks',
    category: 'flooring',
    textureSet: 'walnut-planks',
    tileSize: 2,
    colorHex: '#5e4331',
    costPerUnit: 11,
    unit: 'sqft',
    wasteFactor: 0.1,
  },
  // Laminate is sold by the box (~2.2 m² / 23.7 sq ft per box).
  {
    id: 'laminate-natural',
    name: 'Natural laminate',
    category: 'flooring',
    textureSet: 'laminate-natural',
    tileSize: 1.7,
    colorHex: '#c9a57c',
    costPerUnit: 72,
    unit: 'box',
    coverage: 2.2,
    wasteFactor: 0.1,
  },
  {
    id: 'laminate-honey',
    name: 'Honey laminate',
    category: 'flooring',
    textureSet: 'laminate-honey',
    tileSize: 2.08,
    colorHex: '#a8743f',
    costPerUnit: 68,
    unit: 'box',
    coverage: 2.2,
    wasteFactor: 0.1,
  },
  {
    id: 'porcelain-tile',
    name: 'Porcelain tile',
    category: 'tile',
    textureSet: 'porcelain-tile',
    tileSize: 3,
    colorHex: '#cfcac2',
    costPerUnit: 7.5,
    unit: 'sqft',
    wasteFactor: 0.15,
  },
  {
    id: 'marble',
    name: 'Marble',
    category: 'tile',
    textureSet: 'marble',
    tileSize: 1.5,
    colorHex: '#e7e4df',
    costPerUnit: 18,
    unit: 'sqft',
    wasteFactor: 0.15,
  },
  {
    id: 'ceramic-tile',
    name: 'Ceramic tile',
    category: 'tile',
    textureSet: 'ceramic-tile',
    tileSize: 1.9,
    colorHex: '#b8b3aa',
    costPerUnit: 5,
    unit: 'sqft',
    wasteFactor: 0.15,
  },
  {
    id: 'polished-concrete',
    name: 'Polished concrete',
    category: 'flooring',
    textureSet: 'polished-concrete',
    tileSize: 2,
    colorHex: '#9c9a96',
    costPerUnit: 8,
    unit: 'sqft',
    wasteFactor: 0.05,
  },
  {
    id: 'carpet-sand',
    name: 'Sand carpet',
    category: 'flooring',
    textureSet: 'carpet-sand',
    tileSize: 1.7,
    colorHex: '#c7bfa9',
    costPerUnit: 4.5,
    unit: 'sqft',
    wasteFactor: 0.1,
  },
  {
    id: 'carpet-navy',
    name: 'Navy carpet',
    category: 'flooring',
    textureSet: 'carpet-navy',
    tileSize: 1.5,
    colorHex: '#38425a',
    costPerUnit: 5,
    unit: 'sqft',
    wasteFactor: 0.1,
  },
  {
    id: 'white-plaster',
    name: 'White plaster',
    category: 'ceiling',
    textureSet: 'white-plaster',
    tileSize: 1,
    colorHex: '#efede8',
    costPerUnit: 3,
    unit: 'sqft',
    wasteFactor: 0.05,
  },
];

/** Interior paint: 37 m² (≈ 400 sq ft) per gallon per coat. */
export const PAINT_COVERAGE_SQM = 37;
export const PAINT_COST_PER_GALLON = 62;
export const PAINT_COATS = 2;

const paint = (id: string, name: string, colorHex: string): Material => ({
  id: `paint-${id}`,
  name,
  category: 'paint',
  colorHex,
  costPerUnit: PAINT_COST_PER_GALLON,
  unit: 'gallon',
  coverage: PAINT_COVERAGE_SQM,
  wasteFactor: 0,
});

/** A curated palette of 24 interior paint colours. */
export const PAINTS: readonly Material[] = [
  paint('chalk', 'Chalk white', '#f4f1ea'),
  paint('linen', 'Linen', '#ece4d6'),
  paint('alabaster', 'Alabaster', '#efeadf'),
  paint('greige', 'Greige', '#d6cfc3'),
  paint('stone', 'Stone', '#bdb5a8'),
  paint('mushroom', 'Mushroom', '#a39788'),
  paint('fog', 'Fog', '#d9dcdc'),
  paint('dove', 'Dove grey', '#b9bcbc'),
  paint('slate', 'Slate', '#6e7479'),
  paint('charcoal', 'Charcoal', '#3d4145'),
  paint('ink', 'Ink', '#262c38'),
  paint('navy', 'Navy', '#2f3e5c'),
  paint('powder', 'Powder blue', '#c8d6e0'),
  paint('harbour', 'Harbour blue', '#7f9bb0'),
  paint('teal', 'Deep teal', '#2f5d62'),
  paint('sage', 'Sage', '#b7bfa6'),
  paint('olive', 'Olive', '#7d8059'),
  paint('forest', 'Forest', '#3f5245'),
  paint('blush', 'Blush', '#e8cfc6'),
  paint('clay', 'Clay', '#c48f73'),
  paint('terracotta', 'Terracotta', '#b0634a'),
  paint('ochre', 'Ochre', '#c99b4a'),
  paint('butter', 'Butter', '#f1e2b0'),
  paint('plum', 'Plum', '#5e4552'),
];

export const OTHER_MATERIALS: readonly Material[] = [
  {
    id: 'baseboard-mdf',
    name: 'MDF baseboard',
    category: 'trim',
    colorHex: '#f4f1ea',
    costPerUnit: 2.6,
    unit: 'lft',
    wasteFactor: 0.1,
  },
  // 4 × 8 ft sheet = 2.973 m²
  {
    id: 'drywall-sheet',
    name: 'Drywall ½″ 4×8 sheet',
    category: 'drywall',
    costPerUnit: 21,
    unit: 'sheet',
    coverage: 2.973,
    wasteFactor: 0.1,
  },
  {
    id: 'interior-door',
    name: 'Interior prehung door',
    category: 'door',
    costPerUnit: 280,
    unit: 'each',
    wasteFactor: 0,
  },
  {
    id: 'window-unit',
    name: 'Vinyl window',
    category: 'window',
    costPerUnit: 520,
    unit: 'each',
    wasteFactor: 0,
  },
  {
    id: 'wall-removal',
    name: 'Wall removal allowance',
    category: 'labour',
    costPerUnit: 450,
    unit: 'each',
    wasteFactor: 0,
  },
];

export const DEFAULT_MATERIALS: readonly Material[] = [...FLOORING, ...PAINTS, ...OTHER_MATERIALS];

export const MATERIALS_BY_ID: ReadonlyMap<string, Material> = new Map(
  DEFAULT_MATERIALS.map((m) => [m.id, m]),
);

const CUSTOM_PAINT = /^paint:(#[0-9a-f]{6})$/i;

/** Id for a custom paint colour, e.g. `paint:#aabbcc`. */
export const customPaintId = (hex: string): string => `paint:${hex.toLowerCase()}`;

/** Looks up a material, including custom paint colours. */
export function getMaterial(id: string | undefined): Material | undefined {
  if (!id) return undefined;
  const known = MATERIALS_BY_ID.get(id);
  if (known) return known;
  const m = CUSTOM_PAINT.exec(id);
  if (m?.[1]) return { ...paint('custom', `Custom ${m[1].toUpperCase()}`, m[1]), id };
  return undefined;
}

export { SQFT_PER_SQM };
