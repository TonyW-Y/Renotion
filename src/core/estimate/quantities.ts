import { pointInPolygon, type Polygon } from '../geometry/polygon';
import { add, lerp, perp, scale } from '../geometry/vec2';
import { wallDirection, wallLength } from '../geometry/walls';
import type { ID, Material, MaterialUnit, Opening, Plan, Wall } from '../types';
import { PAINT_COATS, PAINT_COVERAGE_SQM, SQFT_PER_SQM } from './defaultCosts';

export const FT_PER_M = 3.28084;
export const BASEBOARD_WASTE = 0.1;
export const DRYWALL_WASTE = 0.1;
export const DRYWALL_SHEET_SQM = 2.973; // 4 × 8 ft

const ceil = (n: number) => Math.ceil(n - 1e-9);

/**
 * Paintable area of ONE side of a wall (m²):
 * length × height − Σ(opening width × height).
 */
export function wallSideArea(
  wall: Pick<Wall, 'start' | 'end' | 'height'>,
  openings: readonly Pick<Opening, 'width' | 'height'>[],
): number {
  const gross = wallLength(wall) * wall.height;
  const holes = openings.reduce((s, o) => s + o.width * o.height, 0);
  return Math.max(0, gross - holes);
}

/** Gallons of paint, rounded up to whole cans. */
export function paintGallons(
  areaSqm: number,
  coats = PAINT_COATS,
  coverageSqmPerGallon = PAINT_COVERAGE_SQM,
): number {
  if (areaSqm <= 0) return 0;
  return ceil((areaSqm * coats) / coverageSqmPerGallon);
}

export interface Quantity {
  quantity: number;
  unit: MaterialUnit;
}

/** Flooring to buy for a room: area × (1 + waste), in the material's unit (rounded up). */
export function flooringQuantity(
  areaSqm: number,
  material: Pick<Material, 'unit' | 'coverage' | 'wasteFactor'>,
): Quantity {
  const withWaste = areaSqm * (1 + material.wasteFactor);
  switch (material.unit) {
    case 'box':
    case 'sheet':
      return { quantity: ceil(withWaste / (material.coverage ?? 1)), unit: material.unit };
    case 'sqft':
      return { quantity: ceil(withWaste * SQFT_PER_SQM), unit: 'sqft' };
    case 'sqm':
      return { quantity: ceil(withWaste * 10) / 10, unit: 'sqm' };
    default:
      return { quantity: ceil(withWaste), unit: material.unit };
  }
}

/**
 * Baseboard length (m) for a room: perimeter − Σ(door widths in the room's
 * walls), plus 10% waste.
 */
export function baseboardMetres(perimeter: number, doorWidths: readonly number[]): number {
  const net = Math.max(0, perimeter - doorWidths.reduce((s, w) => s + w, 0));
  return net * (1 + BASEBOARD_WASTE);
}

/** Linear metres → whole linear feet. */
export const toLinearFeet = (metres: number): number => ceil(metres * FT_PER_M);

/** Drywall sheets for an area, with 10% waste. */
export function drywallSheets(areaSqm: number, sheetSqm = DRYWALL_SHEET_SQM): number {
  if (areaSqm <= 0) return 0;
  return ceil((areaSqm * (1 + DRYWALL_WASTE)) / sheetSqm);
}

export interface RoomShare {
  /** Room key, or null for the exterior. */
  roomKey: string | null;
  /** Fraction of the wall side facing this room (0–1). */
  fraction: number;
}

export interface WallSides {
  a: RoomShare[];
  b: RoomShare[];
}

/**
 * Which room(s) each side of each wall faces. Samples points just off both
 * faces along the wall, so a long wall facing several rooms is split fairly.
 * Side A is to the left of start→end.
 */
export function wallSideRooms(
  plan: Pick<Plan, 'walls'>,
  rooms: readonly { key: string; polygon: Polygon }[],
  samples = 24,
): Map<ID, WallSides> {
  const out = new Map<ID, WallSides>();
  for (const w of plan.walls) {
    const n = perp(wallDirection(w));
    const off = w.thickness / 2 + 0.03;
    const tally = { a: new Map<string | null, number>(), b: new Map<string | null, number>() };
    for (let i = 0; i < samples; i++) {
      const p = lerp(w.start, w.end, (i + 0.5) / samples);
      for (const [side, sign] of [
        ['a', 1],
        ['b', -1],
      ] as const) {
        const probe = add(p, scale(n, off * sign));
        const room = rooms.find((r) => pointInPolygon(probe, r.polygon));
        const key = room?.key ?? null;
        tally[side].set(key, (tally[side].get(key) ?? 0) + 1);
      }
    }
    const shares = (m: Map<string | null, number>): RoomShare[] =>
      [...m.entries()].map(([roomKey, count]) => ({ roomKey, fraction: count / samples }));
    out.set(w.id, { a: shares(tally.a), b: shares(tally.b) });
  }
  return out;
}
