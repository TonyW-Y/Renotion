import type {
  FurnitureColors,
  FurnitureItem,
  FurnitureSize,
  ID,
  Opening,
  RoomMeta,
  Vec2,
  Wall,
} from '../types';

/** A patch where `null` clears an optional field. */
export interface WallPatch {
  thickness?: number;
  height?: number;
  finishA?: ID | null;
  finishB?: ID | null;
}

export interface OpeningPatch {
  type?: Opening['type'];
  width?: number;
  height?: number;
  sillHeight?: number;
  offset?: number;
  hinge?: 'start' | 'end' | null;
  swing?: 'a' | 'b' | null;
}

export interface FurniturePatch {
  modelId?: string;
  position?: Vec2;
  rotation?: number;
  elevation?: number | null;
  size?: FurnitureSize | null;
  colors?: FurnitureColors | null;
}

/** An opening plus its position in `plan.openings`, so deletes undo in place. */
export interface IndexedOpening {
  opening: Opening;
  index: number;
}

/**
 * Every edit to a plan is a Command: plain, serializable data.
 * `applyCommand` performs it and `invertCommand` produces its inverse, which
 * gives undo/redo for free and lets commands be sent over the wire later.
 */
export type Command =
  | { type: 'addWall'; wall: Wall; index?: number }
  | { type: 'deleteWall'; wall: Wall; index: number; openings: IndexedOpening[] }
  | { type: 'moveWallEndpoint'; wallId: ID; endpoint: 'start' | 'end'; from: Vec2; to: Vec2 }
  | { type: 'setWallProps'; wallId: ID; from: WallPatch; to: WallPatch }
  | { type: 'addOpening'; opening: Opening; index?: number }
  | { type: 'deleteOpening'; opening: Opening; index: number }
  | { type: 'moveOpening'; openingId: ID; from: number; to: number }
  | { type: 'setOpeningProps'; openingId: ID; from: OpeningPatch; to: OpeningPatch }
  | { type: 'setRoomMeta'; from: RoomMeta | null; to: RoomMeta | null }
  | { type: 'addFurniture'; item: FurnitureItem; index?: number }
  | { type: 'deleteFurniture'; item: FurnitureItem; index: number }
  | { type: 'setFurnitureProps'; itemId: ID; from: FurniturePatch; to: FurniturePatch }
  | { type: 'batch'; label: string; commands: Command[] };

export type CommandType = Command['type'];
