import type { ThreeEvent } from '@react-three/fiber';
import { memo, Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { angle } from '@/core/geometry/vec2';
import { wallSegments } from '@/core/geometry/wallSegments';
import type { EndCut, WallEndCuts } from '@/core/geometry/wallEnds';
import { openingSpan, wallDirection, wallLength } from '@/core/geometry/walls';
import type { ResolvedRoom } from '@/core/rooms';
import type { Opening, Plan, Wall } from '@/core/types';
import { useUiStore, type Selection } from '@/state/uiStore';
import { getMaterial } from '@/core/estimate/defaultCosts';
import {
  useSurfaceMaterial,
  useTexturedFloor,
  useWallSideMaterial,
  wallEdgeMaterial,
  type HighlightState,
} from './finishMaterials';
import { FurnitureModels } from './FurnitureModels';
import { highlighted, MATERIALS } from './materials';
import { openingParts } from './openingDesigns';
import { wallPieceGeometry } from './wallGeometry';

const CLICK_SLOP_PX = 4;

function useHighlight(
  base: THREE.MeshStandardMaterial,
  state: 'none' | 'hover' | 'selected',
  accent: string,
) {
  const mat = useMemo(
    () => (state === 'none' ? base : highlighted(base, accent, state === 'selected' ? 0.55 : 0.2)),
    [base, state, accent],
  );
  useEffect(
    () => () => {
      if (mat !== base) mat.dispose();
    },
    [mat, base],
  );
  return mat;
}

function interactions(target: Selection) {
  const ui = () => useUiStore.getState();
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > CLICK_SLOP_PX) return; // was an orbit drag
      e.stopPropagation();
      // Wall boxes: local +z is side B, −z is side A.
      const nz = e.face?.normal.z ?? 0;
      const side = target.kind === 'wall' && Math.abs(nz) > 0.5 ? (nz > 0 ? 'b' : 'a') : undefined;
      ui().select(side ? { ...target, side } : target);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      ui().setHover(target);
    },
    onPointerOut: () => {
      const h = ui().hover;
      if (h?.kind === target.kind && h.id === target.id) ui().setHover(null);
    },
  };
}

const stateOf = (
  sel: Selection | null,
  hover: Selection | null,
  kind: Selection['kind'],
  id: string,
) =>
  sel?.kind === kind && sel.id === id
    ? 'selected'
    : hover?.kind === kind && hover.id === id
      ? 'hover'
      : 'none';

/* ------------------------------------------------------------------ */

interface WallMeshProps {
  wall: Wall;
  openings: readonly Opening[];
  cuts: WallEndCuts | undefined;
  state: 'none' | 'hover' | 'selected';
  accent: string;
  interactive: boolean;
}

const sameCut = (a: EndCut | undefined, b: EndCut | undefined) =>
  a?.a === b?.a && a?.b === b?.b && a?.joined === b?.joined;

const WallMesh = memo(
  function WallMesh({ wall, openings, cuts, state, accent, interactive }: WallMeshProps) {
    const pieces = useMemo(() => {
      const boxes = wallSegments(wall, openings);
      const len = wallLength(wall);
      const last = boxes.length - 1;
      return boxes.map((b, i) => {
        const atStart = i === 0 && b.u0 <= 1e-6 && cuts?.start.joined;
        const atEnd = i === last && b.u1 >= len - 1e-6 && cuts?.end.joined;
        const geometry = wallPieceGeometry({
          u0A: atStart ? -cuts.start.a : b.u0,
          u0B: atStart ? -cuts.start.b : b.u0,
          u1A: atEnd ? len + cuts.end.a : b.u1,
          u1B: atEnd ? len + cuts.end.b : b.u1,
          z0: b.z0,
          z1: b.z1,
          thickness: wall.thickness,
        });
        return { geometry, hideStart: !!atStart, hideEnd: !!atEnd };
      });
    }, [wall, openings, cuts]);
    useEffect(() => () => pieces.forEach((p) => p.geometry.dispose()), [pieces]);

    // Face order: end, start, top, bottom, side B, side A. Joined end faces are
    // buried against the neighbouring wall, so they're hidden.
    const sideA = useWallSideMaterial(wall.finishA, wall.tintA, state, accent);
    const sideB = useWallSideMaterial(wall.finishB, wall.tintB, state, accent);
    const mats = useMemo(() => {
      const edge = wallEdgeMaterial(state, accent);
      return pieces.map((p) => [
        p.hideEnd ? MATERIALS.hidden : edge,
        p.hideStart ? MATERIALS.hidden : edge,
        edge,
        edge,
        sideB,
        sideA,
      ]);
    }, [pieces, sideA, sideB, state, accent]);

    const a = angle(wallDirection(wall));
    return (
      <group
        position={[wall.start.x, 0, -wall.start.y]}
        rotation={[0, a, 0]}
        {...(interactive ? interactions({ kind: 'wall', id: wall.id }) : {})}
      >
        {pieces.map((p, i) => (
          <mesh
            key={i}
            geometry={p.geometry}
            material={mats[i] ?? MATERIALS.wall}
            castShadow
            receiveShadow
          />
        ))}
      </group>
    );
  },
  // Re-render only when this wall's geometry inputs actually change.
  (a, b) =>
    a.wall === b.wall &&
    a.state === b.state &&
    a.accent === b.accent &&
    a.interactive === b.interactive &&
    sameCut(a.cuts?.start, b.cuts?.start) &&
    sameCut(a.cuts?.end, b.cuts?.end) &&
    a.openings.length === b.openings.length &&
    a.openings.every((o, i) => o === b.openings[i]),
);

/* ------------------------------------------------------------------ */

function OpeningMesh({
  opening,
  wall,
  state,
  accent,
  interactive,
}: {
  opening: Opening;
  wall: Wall;
  state: HighlightState;
  accent: string;
  interactive: boolean;
}) {
  const span = openingSpan(opening, wall);
  const a = angle(wallDirection(wall));
  const parts = useMemo(() => openingParts(opening, wall.thickness), [opening, wall.thickness]);
  // Hover / selection tint: one highlighted copy per distinct material.
  const tinted = useMemo(() => {
    if (state === 'none') return null;
    const m = new Map<THREE.Material, THREE.Material>();
    for (const p of parts) {
      if (!m.has(p.material) && p.material instanceof THREE.MeshStandardMaterial) {
        m.set(p.material, highlighted(p.material, accent, state === 'selected' ? 0.55 : 0.2));
      }
    }
    return m;
  }, [parts, state, accent]);
  useEffect(
    () => () => {
      tinted?.forEach((m) => {
        m.dispose();
      });
    },
    [tinted],
  );
  const centreU = (span.from + span.to) / 2;
  return (
    <group position={[wall.start.x, 0, -wall.start.y]} rotation={[0, a, 0]}>
      <group
        position={[centreU, opening.sillHeight, 0]}
        {...(interactive ? interactions({ kind: 'opening', id: opening.id }) : {})}
      >
        {parts.map((p, i) => (
          <mesh
            key={i}
            position={p.position}
            material={tinted?.get(p.material) ?? p.material}
            castShadow={p.shadow ?? true}
            receiveShadow
          >
            <boxGeometry args={p.size} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */

function roomGeometry(room: ResolvedRoom) {
  const shape = new THREE.Shape(room.polygon.map((p) => new THREE.Vector2(p.x, p.y)));
  return new THREE.ShapeGeometry(shape);
}

interface FloorProps {
  room: ResolvedRoom;
  state: HighlightState;
  accent: string;
  interactive: boolean;
}

function FloorMesh({
  room,
  material,
  interactive,
}: {
  room: ResolvedRoom;
  material: THREE.Material;
  interactive: boolean;
}) {
  const geo = useMemo(() => roomGeometry(room), [room]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh
      geometry={geo}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.002, 0]}
      receiveShadow
      {...(interactive ? interactions({ kind: 'room', id: room.key }) : {})}
    />
  );
}

function PlainFloor({
  room,
  state,
  accent,
  interactive,
  color,
}: FloorProps & { color?: string | undefined }) {
  const base = useMemo(
    () => (color ? new THREE.MeshStandardMaterial({ color, roughness: 0.85 }) : MATERIALS.floor),
    [color],
  );
  const mat = useHighlight(base, state, accent);
  return <FloorMesh room={room} material={mat} interactive={interactive} />;
}

function TexturedFloor({
  room,
  state,
  accent,
  interactive,
  set,
  tileSize,
}: FloorProps & { set: string; tileSize: number }) {
  const mat = useTexturedFloor(set, tileSize, state, accent, room.meta?.floorTint);
  return <FloorMesh room={room} material={mat} interactive={interactive} />;
}

function RoomFloor(props: FloorProps) {
  const m = getMaterial(props.room.meta?.floorMaterial);
  if (m?.textureSet) {
    return (
      <Suspense
        fallback={<PlainFloor {...props} color={props.room.meta?.floorTint ?? m.colorHex} />}
      >
        <TexturedFloor {...props} set={m.textureSet} tileSize={m.tileSize ?? 1} />
      </Suspense>
    );
  }
  return <PlainFloor {...props} color={m?.colorHex} />;
}

function RoomCeiling({
  room,
  height,
  accent,
}: {
  room: ResolvedRoom;
  height: number;
  accent: string;
}) {
  const geo = useMemo(() => roomGeometry(room), [room]);
  useEffect(() => () => geo.dispose(), [geo]);
  const material = useSurfaceMaterial(
    room.meta?.ceilingMaterial,
    room.meta?.ceilingTint,
    'none',
    accent,
    'ceiling',
  );
  return (
    <mesh
      geometry={geo}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, height, 0]}
      receiveShadow
    />
  );
}

/* ------------------------------------------------------------------ */

interface PlanModelProps {
  plan: Plan;
  rooms: readonly ResolvedRoom[];
  cuts: Map<string, WallEndCuts>;
  ceilings: boolean;
  accent: string;
  interactive?: boolean;
}

/** The 3D building, derived entirely from the 2D plan. */
export function PlanModel({
  plan,
  rooms,
  cuts,
  ceilings,
  accent,
  interactive = true,
}: PlanModelProps) {
  const selection = useUiStore((s) => s.selection);
  const hover = useUiStore((s) => s.hover);
  const openingsByWall = useMemo(() => {
    const m = new Map<string, Opening[]>();
    for (const o of plan.openings) m.set(o.wallId, [...(m.get(o.wallId) ?? []), o]);
    return m;
  }, [plan.openings]);
  const wallsById = useMemo(() => new Map(plan.walls.map((w) => [w.id, w])), [plan.walls]);
  const EMPTY: Opening[] = useMemo(() => [], []);

  return (
    <group>
      {plan.walls.map((w) => (
        <WallMesh
          key={w.id}
          wall={w}
          openings={openingsByWall.get(w.id) ?? EMPTY}
          cuts={cuts.get(w.id)}
          state={interactive ? stateOf(selection, hover, 'wall', w.id) : 'none'}
          accent={accent}
          interactive={interactive}
        />
      ))}
      {plan.openings.map((o) => {
        const w = wallsById.get(o.wallId);
        return w ? (
          <OpeningMesh
            key={o.id}
            opening={o}
            wall={w}
            state={interactive ? stateOf(selection, hover, 'opening', o.id) : 'none'}
            accent={accent}
            interactive={interactive}
          />
        ) : null;
      })}
      {rooms.map((r) => (
        <RoomFloor
          key={r.key}
          room={r}
          state={interactive ? stateOf(selection, hover, 'room', r.key) : 'none'}
          accent={accent}
          interactive={interactive}
        />
      ))}
      <FurnitureModels items={plan.furniture} interactive={interactive} accent={accent} />
      {ceilings &&
        rooms.map((r) => {
          const h = Math.min(...r.wallIds.map((id) => wallsById.get(id)?.height ?? 2.44));
          return <RoomCeiling key={`c-${r.key}`} room={r} height={h} accent={accent} />;
        })}
    </group>
  );
}
