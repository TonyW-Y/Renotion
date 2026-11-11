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
  /** Recolour for a textured finish on side A / B (#hex). */
  tintA?: string;
  tintB?: string;
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
  /** Doors: which end of the opening the hinge is on. Default 'start'. */
  hinge?: 'start' | 'end';
  /** Doors: which side of the wall the leaf swings into. Default 'a' (left). */
  swing?: 'a' | 'b';
  /** Design; defaults to 'slab' for doors and 'casement' for windows. */
  style?: OpeningStyle;
  /** Door leaf / window frame colour (#hex); the default finish when absent. */
  color?: string;
}

export type DoorStyle = 'slab' | 'panel' | 'glass' | 'barn' | 'double' | 'pet';
export type WindowStyle = 'casement' | 'double-hung' | 'slider' | 'picture' | 'grid' | 'bay';
export type OpeningStyle = DoorStyle | WindowStyle;

/** Rooms are derived from walls; this stores user data keyed by a stable room key. */
export interface RoomMeta {
  key: string;
  name: string;
  floorMaterial?: ID;
  /** Recolour for a textured floor (#hex). */
  floorTint?: string;
  ceilingMaterial?: ID;
  /** Recolour for a textured ceiling (#hex). */
  ceilingTint?: string;
}

/** Real-world furniture dimensions (metres). */
export interface FurnitureSize {
  width: number;
  depth: number;
  height: number;
}

export interface FurnitureItem {
  id: ID;
  modelId: string;
  position: Vec2;
  /** Radians around the vertical axis. */
  rotation: number;
  elevation?: number;
  /** Custom size; the catalogue size when absent. */
  size?: FurnitureSize;
  /** Custom colours for the model's main (primary) and accent (secondary) materials. */
  colors?: FurnitureColors;
  /** The user's own price for this piece (CAD); the estimated price when absent. */
  price?: number;
}

export interface FurnitureColors {
  primary?: string;
  secondary?: string;
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

export type MaterialCategory =
  | 'paint'
  | 'flooring'
  | 'tile'
  | 'ceiling'
  | 'trim'
  | 'drywall'
  | 'door'
  | 'window'
  | 'labour'
  | 'furniture'
  | 'wallFinish';

/** Purchase unit. Lengths/areas are converted from metres at estimate time. */
export type MaterialUnit = 'gallon' | 'sqft' | 'sqm' | 'box' | 'lft' | 'sheet' | 'each';

export interface Material {
  id: ID;
  name: string;
  category: MaterialCategory;
  /** Flat colour for paint; also the 2D swatch / fallback colour. */
  colorHex?: string;
  /** Folder under /assets/textures. */
  textureSet?: string;
  /** Real-world size (m) covered by one texture tile. */
  tileSize?: number;
  /** CAD per unit — a rough default, overridable per project. */
  costPerUnit: number;
  unit: MaterialUnit;
  /** Paint: m² per gallon. Box / sheet: m² per box / sheet. */
  coverage?: number;
  /** e.g. 0.10 for flooring, 0.15 for tile. */
  wasteFactor: number;
}

export const DEFAULT_WALL_THICKNESS = 0.15;
export const DEFAULT_WALL_HEIGHT = 2.44;

export const DEFAULT_DOOR = { width: 0.9, height: 2.03, sillHeight: 0 } as const;
export const DEFAULT_WINDOW = { width: 1.2, height: 1.2, sillHeight: 0.9 } as const;

export function createEmptyPlan(units: Plan['units'] = 'metric'): Plan {
  return { version: 1, units, walls: [], openings: [], rooms: [], furniture: [] };
}
