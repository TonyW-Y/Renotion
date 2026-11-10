/**
 * Core data model. The 2D plan is the single source of truth; 3D geometry,
 * quantities, costs and tasks are all derived from it.
 * All lengths are in metres. Plan space: x = east, y = north.
 */

export type ID = string;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Wall {
  id: ID;
  start: Vec2;
  end: Vec2;
  /** Default 0.15 m. */
  thickness: number;
  /** Default 2.44 m (8 ft). */
  height: number;
  /** Material id, side A (left of start→end). */
  finishA?: ID;
  /** Material id, side B (right of start→end). */
  finishB?: ID;
}

export type OpeningType = 'door' | 'window';

export interface Opening {
  id: ID;
  wallId: ID;
  type: OpeningType;
  /** Distance from wall.start along the wall to the opening centre. */
  offset: number;
  width: number;
  height: number;
  /** 0 for doors. */
  sillHeight: number;
}

/** Rooms are derived from walls; this stores user data keyed by a stable room key. */
export interface RoomMeta {
  key: string;
  name: string;
  floorMaterial?: ID;
  ceilingMaterial?: ID;
}

export interface FurnitureItem {
  id: ID;
  modelId: string;
  position: Vec2;
  /** Radians around the vertical axis. */
  rotation: number;
  elevation?: number;
}

export interface Plan {
  version: 1;
  /** Display preference only. */
  units: 'metric' | 'imperial';
  walls: Wall[];
  openings: Opening[];
  rooms: RoomMeta[];
  furniture: FurnitureItem[];
}

export type MaterialCategory = 'paint' | 'flooring' | 'tile' | 'ceiling';
export type MaterialUnit = 'gallon' | 'sqft' | 'sqm' | 'box';

export interface Material {
  id: ID;
  name: string;
  category: MaterialCategory;
  colorHex?: string;
  textureSet?: string;
  /** CAD. */
  costPerUnit: number;
  unit: MaterialUnit;
  coverage?: number;
  wasteFactor: number;
}

export const DEFAULT_WALL_THICKNESS = 0.15;
export const DEFAULT_WALL_HEIGHT = 2.44;

export function createEmptyPlan(units: Plan['units'] = 'metric'): Plan {
  return { version: 1, units, walls: [], openings: [], rooms: [], furniture: [] };
}
