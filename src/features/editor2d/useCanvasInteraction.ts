import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  setFurnitureProps,
  addOpening,
  addWall,
  applyCommand,
  deleteOpening,
  deleteWall,
  moveCorner,
  moveOpening,
  translateWall,
  type Command,
} from '@/core/commands';
import { canPlaceFurniture, furnitureFootprint, modelFor } from '@/core/furniture/placement';
import { cornerAt, hitTest } from '@/core/geometry/hitTest';
import { snapPoint, snapToGrid, type SnapResult } from '@/core/geometry/snapping';
import { distance, equals, pointToSegmentDistance, sub } from '@/core/geometry/vec2';
import {
  canPlaceOpening,
  clampOpeningOffset,
  offsetAlongWall,
  wallLength,
} from '@/core/geometry/walls';
import type { ResolvedRoom } from '@/core/rooms';
import {
  DEFAULT_DOOR,
  DEFAULT_WINDOW,
  type FurnitureItem,
  type Opening,
  type Plan,
  type Vec2,
  type Wall,
} from '@/core/types';
import { setDraggingModel, getDraggingModel } from '@/features/furniture/dragState';
import { FURNITURE_MIME } from '@/features/furniture/FurnitureCatalog';
import { createId } from '@/lib/id';
import { usePlanStore } from '@/state/planStore';
import { useUiStore, type Selection } from '@/state/uiStore';
import { toWorld, type View } from './viewport';

const DRAG_THRESHOLD_PX = 4;
const CORNER_PICK_PX = 9;
const MIN_WALL_LENGTH = 0.05;

type Drag =
  | { kind: 'pan'; sx: number; sy: number; pan0: Vec2 }
  | { kind: 'maybe-pan'; sx: number; sy: number; pan0: Vec2 }
  | { kind: 'corner'; sx: number; sy: number; at: Vec2; to: Vec2; moved: boolean }
  | { kind: 'wall'; sx: number; sy: number; wallId: string; w0: Vec2; delta: Vec2; moved: boolean }
  | { kind: 'opening'; sx: number; sy: number; openingId: string; offset: number; moved: boolean }
  | {
      kind: 'furniture';
      sx: number;
      sy: number;
      itemId: string;
      grab: Vec2;
      position: Vec2;
      moved: boolean;
    }
  | { kind: 'rotate'; sx: number; sy: number; itemId: string; rotation: number; moved: boolean };

const ROTATE_HANDLE_GAP = 0.35;
const FURNITURE_GRID = 0.05;
const snapAngleRad = (a: number, stepDeg: number) => {
  const step = (stepDeg * Math.PI) / 180;
  return Math.round(a / step) * step;
};

/** Where the rotate handle of a furniture item sits (in front of it). */
export function rotateHandleAt(
  item: Pick<FurnitureItem, 'modelId' | 'position' | 'rotation' | 'size'>,
): Vec2 | null {
  const m = modelFor(item);
  if (!m) return null;
  const r = m.depth / 2 + ROTATE_HANDLE_GAP;
  // Local front is −y in plan space at rotation 0.
  return {
    x: item.position.x + Math.sin(item.rotation) * r,
    y: item.position.y - Math.cos(item.rotation) * r,
  };
}

export interface FurnitureGhost {
  item: FurnitureItem;
  valid: boolean;
}

export interface WallChain {
  anchor: Vec2;
  first: Vec2;
}

export interface Ghost {
  opening: Opening;
  wall: Wall;
  valid: boolean;
}

export interface CanvasInteraction {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  /** The plan with any in-progress drag applied. */
  previewPlan: Plan;
  chain: WallChain | null;
  /** Snapped pointer for the wall tool. */
  snap: SnapResult | null;
  ghost: Ghost | null;
  furnitureGhost: FurnitureGhost | null;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  hoverCorner: Vec2 | null;
  activeCorner: Vec2 | null;
  cursor: string;
}

const local = (e: ReactPointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

const sameSel = (a: Selection | null, b: Selection | null) =>
  a?.kind === b?.kind && a?.id === b?.id;

export function useCanvasInteraction(
  view: View,
  plan: Plan,
  rooms: readonly ResolvedRoom[],
): CanvasInteraction {
  const tool = useUiStore((s) => s.tool);
  const execute = usePlanStore((s) => s.execute);

  const [drag, setDrag] = useState<Drag | null>(null);
  const [chain, setChain] = useState<WallChain | null>(null);
  const [snap, setSnap] = useState<SnapResult | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [furnitureGhost, setFurnitureGhost] = useState<FurnitureGhost | null>(null);
  const placing = useUiStore((s) => s.placing);
  const placeRotation = useUiStore((s) => s.placeRotation);
  const [hoverCorner, setHoverCorner] = useState<Vec2 | null>(null);
  const [space, setSpace] = useState(false);

  const endpoints = useMemo(() => plan.walls.flatMap((w) => [w.start, w.end]), [plan.walls]);
  const snapRadius = Math.max(8 / view.s, Math.min(0.2, 24 / view.s));
  const pickTol = 6 / view.s;

  // Switching tools ends any wall chain and clears previews (reset during render).
  const [prevTool, setPrevTool] = useState(tool);
  if (tool !== prevTool) {
    setPrevTool(tool);
    setChain(null);
    setSnap(null);
    setGhost(null);
    setFurnitureGhost(null);
  }

  // Keyboard: Escape/Enter finish a chain; Space enables temporary panning.
  useEffect(() => {
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if ((e.key === 'Escape' || e.key === 'Enter') && chain) {
        e.preventDefault();
        setChain(null);
      }
      if (e.key === ' ') {
        e.preventDefault();
        setSpace(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpace(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [chain]);

  const snapFor = (
    world: Vec2,
    shift: boolean,
    opts: { exclude?: Vec2; anchor?: Vec2 | null } = {},
  ): SnapResult => {
    const ex = opts.exclude;
    const pts = ex ? endpoints.filter((p) => distance(p, ex) > 1e-6) : endpoints;
    const walls = ex
      ? plan.walls.filter((w) => distance(w.start, ex) > 1e-6 && distance(w.end, ex) > 1e-6)
      : plan.walls;
    return snapPoint(world, {
      anchor: opts.anchor ?? null,
      angleSnap: !shift,
      endpoints: pts,
      walls,
      endpointRadius: snapRadius,
      wallRadius: snapRadius * 0.75,
    });
  };

  const nearestWall = (world: Vec2): Wall | null => {
    let best: Wall | null = null;
    let bestD = Infinity;
    for (const w of plan.walls) {
      const d = pointToSegmentDistance(world, w.start, w.end);
      if (d <= w.thickness / 2 + 14 / view.s && d < bestD) {
        bestD = d;
        best = w;
      }
    }
    return best;
  };

  const ghostFor = (world: Vec2, type: 'door' | 'window'): Ghost | null => {
    const wall = nearestWall(world);
    if (!wall) return null;
    const dims = type === 'door' ? DEFAULT_DOOR : DEFAULT_WINDOW;
    const raw = Math.round(offsetAlongWall(world, wall) / 0.05) * 0.05;
    const clamped = clampOpeningOffset(raw, dims.width, wallLength(wall));
    const opening: Opening = {
      id: 'ghost',
      wallId: wall.id,
      type,
      offset: clamped ?? raw,
      ...dims,
    };
    const valid = clamped !== null && canPlaceOpening(opening, wall, plan.openings, wall.id);
    return { opening, wall, valid };
  };

  const footprintOf = (id: string) => {
    const f = plan.furniture.find((x) => x.id === id);
    return f ? furnitureFootprint(f) : null;
  };
  const hitAt = (world: Vec2) =>
    hitTest(plan, world, { tolerance: pickTol, rooms, furnitureFootprint: footprintOf });

  const ghostItem = (modelId: string, world: Vec2, rotation: number): FurnitureGhost => {
    const item: FurnitureItem = {
      id: 'ghost',
      modelId,
      position: snapToGrid(world, FURNITURE_GRID),
      rotation,
    };
    return { item, valid: canPlaceFurniture(item, plan) };
  };

  const pending: Command | null = useMemo(() => {
    if (!drag) return null;
    switch (drag.kind) {
      case 'corner':
        return drag.moved ? moveCorner(plan, drag.at, drag.to) : null;
      case 'wall':
        return drag.moved && (drag.delta.x !== 0 || drag.delta.y !== 0)
          ? translateWall(plan, drag.wallId, drag.delta)
          : null;
      case 'opening':
        return drag.moved ? moveOpening(plan, drag.openingId, drag.offset) : null;
      case 'furniture':
        return drag.moved
          ? setFurnitureProps(plan, drag.itemId, { position: drag.position })
          : null;
      case 'rotate':
        return drag.moved
          ? setFurnitureProps(plan, drag.itemId, { rotation: drag.rotation })
          : null;
      default:
        return null;
    }
  }, [drag, plan]);

  const previewPlan = useMemo(
    () => (pending ? applyCommand(plan, pending) : plan),
    [pending, plan],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = local(e);
    const world = toWorld(s, view);
    const { pan, select } = useUiStore.getState();

    if (e.button === 1 || (e.button === 0 && space)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ kind: 'pan', sx: s.x, sy: s.y, pan0: pan });
      return;
    }
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    switch (tool) {
      case 'wall': {
        const r = snapFor(world, e.shiftKey, { anchor: chain?.anchor ?? null });
        const p = r.point;
        if (!chain) {
          setChain({ anchor: p, first: p });
          return;
        }
        if (distance(chain.anchor, p) < MIN_WALL_LENGTH) return;
        execute(addWall(createId(), chain.anchor, p));
        const closes = (r.kind === 'endpoint' || r.kind === 'wall') && !equals(p, chain.anchor);
        setChain(closes ? null : { anchor: p, first: chain.first });
        return;
      }
      case 'door':
      case 'window': {
        const g = ghostFor(world, tool);
        if (g?.valid) {
          const id = createId();
          execute(addOpening({ ...g.opening, id }));
        }
        return;
      }
      case 'furniture': {
        if (!placing) return;
        const g = ghostItem(placing, world, placeRotation);
        if (g.valid) execute({ type: 'addFurniture', item: { ...g.item, id: createId() } });
        return;
      }
      case 'delete': {
        const hit = hitAt(world);
        if (hit?.kind === 'wall') execute(deleteWall(plan, hit.id));
        if (hit?.kind === 'opening') execute(deleteOpening(plan, hit.id));
        if (hit?.kind === 'furniture') {
          const index = plan.furniture.findIndex((f) => f.id === hit.id);
          const item = plan.furniture[index];
          if (item) execute({ type: 'deleteFurniture', item, index });
        }
        select(null);
        return;
      }
      case 'select': {
        const { selection } = useUiStore.getState();
        if (selection?.kind === 'furniture') {
          const item = plan.furniture.find((f) => f.id === selection.id);
          const handle = item && rotateHandleAt(item);
          if (item && handle && distance(handle, world) <= CORNER_PICK_PX / view.s) {
            setDrag({
              kind: 'rotate',
              sx: s.x,
              sy: s.y,
              itemId: item.id,
              rotation: item.rotation,
              moved: false,
            });
            return;
          }
        }
        const corner = cornerAt(plan, world, CORNER_PICK_PX / view.s);
        const hit = hitAt(world);
        if (corner) {
          setDrag({ kind: 'corner', sx: s.x, sy: s.y, at: corner, to: corner, moved: false });
          return;
        }
        select(hit);
        if (hit?.kind === 'opening') {
          const o = plan.openings.find((x) => x.id === hit.id);
          if (o)
            setDrag({
              kind: 'opening',
              sx: s.x,
              sy: s.y,
              openingId: o.id,
              offset: o.offset,
              moved: false,
            });
        } else if (hit?.kind === 'furniture') {
          const f = plan.furniture.find((x) => x.id === hit.id);
          if (f) {
            setDrag({
              kind: 'furniture',
              sx: s.x,
              sy: s.y,
              itemId: f.id,
              grab: sub(f.position, world),
              position: f.position,
              moved: false,
            });
          }
        } else if (hit?.kind === 'wall') {
          setDrag({
            kind: 'wall',
            sx: s.x,
            sy: s.y,
            wallId: hit.id,
            w0: world,
            delta: { x: 0, y: 0 },
            moved: false,
          });
        } else if (!hit) {
          setDrag({ kind: 'maybe-pan', sx: s.x, sy: s.y, pan0: pan });
        }
        return;
      }
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = local(e);
    const world = toWorld(s, view);
    const ui = useUiStore.getState();
    ui.setCursor(world);

    if (drag) {
      const moved = Math.hypot(s.x - drag.sx, s.y - drag.sy) > DRAG_THRESHOLD_PX;
      switch (drag.kind) {
        case 'pan':
          ui.setPan({ x: drag.pan0.x + s.x - drag.sx, y: drag.pan0.y + s.y - drag.sy });
          return;
        case 'maybe-pan':
          if (moved) setDrag({ ...drag, kind: 'pan' });
          return;
        case 'corner': {
          if (!moved && !drag.moved) return;
          const r = snapFor(world, e.shiftKey, { exclude: drag.at });
          setSnap(r);
          setDrag({ ...drag, to: r.point, moved: true });
          return;
        }
        case 'wall': {
          if (!moved && !drag.moved) return;
          setDrag({ ...drag, delta: snapToGrid(sub(world, drag.w0), 0.05), moved: true });
          return;
        }
        case 'furniture': {
          if (!moved && !drag.moved) return;
          const f = plan.furniture.find((x) => x.id === drag.itemId);
          if (!f) return;
          const position = snapToGrid(
            { x: world.x + drag.grab.x, y: world.y + drag.grab.y },
            FURNITURE_GRID,
          );
          setDrag(
            canPlaceFurniture({ ...f, position }, plan)
              ? { ...drag, position, moved: true }
              : { ...drag, moved: true },
          );
          return;
        }
        case 'rotate': {
          const f = plan.furniture.find((x) => x.id === drag.itemId);
          if (!f) return;
          // Handle points along local front (−y at rotation 0) → angle from item to cursor.
          const raw = Math.atan2(world.x - f.position.x, -(world.y - f.position.y));
          const rotation = e.shiftKey ? raw : snapAngleRad(raw, 15);
          setDrag(
            canPlaceFurniture({ ...f, rotation }, plan)
              ? { ...drag, rotation, moved: true }
              : { ...drag, moved: true },
          );
          return;
        }
        case 'opening': {
          if (!moved && !drag.moved) return;
          const o = plan.openings.find((x) => x.id === drag.openingId);
          const w = o && plan.walls.find((x) => x.id === o.wallId);
          if (!o || !w) return;
          const raw = Math.round(offsetAlongWall(world, w) / 0.05) * 0.05;
          const off = clampOpeningOffset(raw, o.width, wallLength(w));
          if (off !== null && canPlaceOpening({ ...o, offset: off }, w, plan.openings, w.id)) {
            setDrag({ ...drag, offset: off, moved: true });
          } else if (!drag.moved) {
            setDrag({ ...drag, moved: true });
          }
          return;
        }
      }
    }

    if (space) return;
    switch (tool) {
      case 'wall':
        setSnap(snapFor(world, e.shiftKey, { anchor: chain?.anchor ?? null }));
        return;
      case 'door':
      case 'window':
        setGhost(ghostFor(world, tool));
        return;
      case 'furniture':
        setFurnitureGhost(placing ? ghostItem(placing, world, placeRotation) : null);
        return;
      case 'select':
      case 'delete': {
        const corner = tool === 'select' ? cornerAt(plan, world, CORNER_PICK_PX / view.s) : null;
        setHoverCorner((prev) => (prev && corner && equals(prev, corner) ? prev : corner));
        const hit = corner ? null : hitAt(world);
        const hover = tool === 'delete' && hit?.kind === 'room' ? null : hit;
        if (!sameSel(hover, ui.hover)) ui.setHover(hover);
        return;
      }
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (!drag) return;
    const ui = useUiStore.getState();
    if (pending) execute(pending);
    if (drag.kind === 'corner' && !drag.moved) {
      ui.select(hitAt(toWorld(local(e), view)));
    }
    if (drag.kind === 'maybe-pan') ui.select(null);
    setDrag(null);
    setSnap(null);
  };

  const onPointerLeave = () => {
    useUiStore.getState().setCursor(null);
    if (!drag) {
      setSnap(null);
      setGhost(null);
      setFurnitureGhost(null);
      setHoverCorner(null);
      useUiStore.getState().setHover(null);
    }
  };

  const panning = drag?.kind === 'pan';
  const cursor = panning
    ? 'grabbing'
    : space
      ? 'grab'
      : tool === 'select'
        ? drag?.kind === 'corner' ||
          drag?.kind === 'wall' ||
          drag?.kind === 'opening' ||
          drag?.kind === 'furniture' ||
          drag?.kind === 'rotate'
          ? 'grabbing'
          : hoverCorner
            ? 'move'
            : 'default'
        : tool === 'delete'
          ? 'pointer'
          : 'crosshair';

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onContextMenu: (e) => {
      e.preventDefault();
      setChain(null);
    },
    onDoubleClick: () => {
      setChain(null);
    },
    previewPlan,
    chain,
    snap,
    ghost,
    furnitureGhost:
      tool === 'furniture' && furnitureGhost
        ? { ...furnitureGhost, item: { ...furnitureGhost.item, rotation: placeRotation } }
        : furnitureGhost,
    onDragOver: (e) => {
      const modelId = getDraggingModel();
      if (!modelId || !e.dataTransfer.types.includes(FURNITURE_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const r = e.currentTarget.getBoundingClientRect();
      setFurnitureGhost(
        ghostItem(
          modelId,
          toWorld({ x: e.clientX - r.left, y: e.clientY - r.top }, view),
          placeRotation,
        ),
      );
    },
    onDrop: (e) => {
      const modelId = e.dataTransfer.getData(FURNITURE_MIME) || getDraggingModel();
      setDraggingModel(null);
      if (!modelId) return;
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      const g = ghostItem(
        modelId,
        toWorld({ x: e.clientX - r.left, y: e.clientY - r.top }, view),
        placeRotation,
      );
      setFurnitureGhost(null);
      if (!g.valid) return;
      const id = createId();
      execute({ type: 'addFurniture', item: { ...g.item, id } });
      useUiStore.getState().setTool('select');
      useUiStore.getState().select({ kind: 'furniture', id });
    },
    onDragLeave: () => {
      setFurnitureGhost(null);
    },
    hoverCorner,
    activeCorner: drag?.kind === 'corner' && drag.moved ? drag.to : null,
    cursor,
  };
}
