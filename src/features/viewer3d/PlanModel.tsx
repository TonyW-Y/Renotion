import type { ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { angle } from '@/core/geometry/vec2';
import { wallSegments } from '@/core/geometry/wallSegments';
import type { EndpointJoins } from '@/core/geometry/wallGraph';
import { openingSpan, wallDirection } from '@/core/geometry/walls';
import type { ResolvedRoom } from '@/core/rooms';
import type { Opening, Plan, Wall } from '@/core/types';
import { useUiStore, type Selection } from '@/state/uiStore';
import { highlighted, MATERIALS } from './materials';

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
      ui().select(target);
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
  joins: EndpointJoins | undefined;
  state: 'none' | 'hover' | 'selected';
  accent: string;
  interactive: boolean;
}

const WallMesh = memo(
  function WallMesh({ wall, openings, joins, state, accent, interactive }: WallMeshProps) {
    const boxes = useMemo(() => wallSegments(wall, openings, joins), [wall, openings, joins]);
    const mat = useHighlight(MATERIALS.wall, state, accent);
    const a = angle(wallDirection(wall));
    return (
      <group
        position={[wall.start.x, 0, -wall.start.y]}
        rotation={[0, a, 0]}
        {...(interactive ? interactions({ kind: 'wall', id: wall.id }) : {})}
      >
        {boxes.map((b, i) => (
          <mesh
            key={i}
            position={[(b.u0 + b.u1) / 2, (b.z0 + b.z1) / 2, 0]}
            material={mat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[b.u1 - b.u0, b.z1 - b.z0, wall.thickness]} />
          </mesh>
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
    a.joins?.start === b.joins?.start &&
    a.joins?.end === b.joins?.end &&
    a.openings.length === b.openings.length &&
    a.openings.every((o, i) => o === b.openings[i]),
);

/* ------------------------------------------------------------------ */

function OpeningMesh({ opening, wall }: { opening: Opening; wall: Wall }) {
  const span = openingSpan(opening, wall);
  const a = angle(wallDirection(wall));
  const w = opening.width;
  const h = opening.height;
  const depth = wall.thickness + 0.02;
  const f = 0.05; // frame size
  const centreU = (span.from + span.to) / 2;
  const base = opening.sillHeight;

  return (
    <group position={[wall.start.x, 0, -wall.start.y]} rotation={[0, a, 0]}>
      <group position={[centreU, base, 0]}>
        {/* Jambs + head */}
        <mesh position={[-w / 2 + f / 2, h / 2, 0]} material={MATERIALS.frame} castShadow>
          <boxGeometry args={[f, h, depth]} />
        </mesh>
        <mesh position={[w / 2 - f / 2, h / 2, 0]} material={MATERIALS.frame} castShadow>
          <boxGeometry args={[f, h, depth]} />
        </mesh>
        <mesh position={[0, h - f / 2, 0]} material={MATERIALS.frame} castShadow>
          <boxGeometry args={[w, f, depth]} />
        </mesh>
        {opening.type === 'window' ? (
          <>
            <mesh position={[0, f / 2, 0]} material={MATERIALS.frame} castShadow>
              <boxGeometry args={[w, f, depth]} />
            </mesh>
            <mesh position={[0, h / 2, 0]} material={MATERIALS.frame}>
              <boxGeometry args={[0.03, h - 2 * f, 0.04]} />
            </mesh>
            <mesh position={[0, h / 2, 0]} material={MATERIALS.glass}>
              <boxGeometry args={[w - 2 * f, h - 2 * f, 0.01]} />
            </mesh>
          </>
        ) : (
          <mesh position={[0, (h - f) / 2, 0]} material={MATERIALS.door} castShadow receiveShadow>
            <boxGeometry args={[w - 2 * f - 0.006, h - f - 0.01, 0.04]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */

function roomGeometry(room: ResolvedRoom) {
  const shape = new THREE.Shape(room.polygon.map((p) => new THREE.Vector2(p.x, p.y)));
  return new THREE.ShapeGeometry(shape);
}

function RoomFloor({
  room,
  state,
  accent,
  interactive,
}: {
  room: ResolvedRoom;
  state: 'none' | 'hover' | 'selected';
  accent: string;
  interactive: boolean;
}) {
  const geo = useMemo(() => roomGeometry(room), [room]);
  useEffect(() => () => geo.dispose(), [geo]);
  const mat = useHighlight(MATERIALS.floor, state, accent);
  return (
    <mesh
      geometry={geo}
      material={mat}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.002, 0]}
      receiveShadow
      {...(interactive ? interactions({ kind: 'room', id: room.key }) : {})}
    />
  );
}

function RoomCeiling({ room, height }: { room: ResolvedRoom; height: number }) {
  const geo = useMemo(() => roomGeometry(room), [room]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh
      geometry={geo}
      material={MATERIALS.ceiling}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, height, 0]}
    />
  );
}

/* ------------------------------------------------------------------ */

interface PlanModelProps {
  plan: Plan;
  rooms: readonly ResolvedRoom[];
  joins: Map<string, EndpointJoins>;
  ceilings: boolean;
  accent: string;
  interactive?: boolean;
}

/** The 3D building, derived entirely from the 2D plan. */
export function PlanModel({
  plan,
  rooms,
  joins,
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
          joins={joins.get(w.id)}
          state={interactive ? stateOf(selection, hover, 'wall', w.id) : 'none'}
          accent={accent}
          interactive={interactive}
        />
      ))}
      {plan.openings.map((o) => {
        const w = wallsById.get(o.wallId);
        return w ? <OpeningMesh key={o.id} opening={o} wall={w} /> : null;
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
      {ceilings &&
        rooms.map((r) => {
          const h = Math.min(...r.wallIds.map((id) => wallsById.get(id)?.height ?? 2.44));
          return <RoomCeiling key={`c-${r.key}`} room={r} height={h} />;
        })}
    </group>
  );
}
