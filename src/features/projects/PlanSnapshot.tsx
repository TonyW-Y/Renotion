import { useMemo } from 'react';
import { getMaterial } from '@/core/estimate/defaultCosts';
import { detectRooms } from '@/core/geometry/roomDetection';
import { endpointJoins } from '@/core/geometry/wallGraph';
import { openingSpan, wallDirection, wallFootprint } from '@/core/geometry/walls';
import { add, perp, scale, sub } from '@/core/geometry/vec2';
import { resolveRooms } from '@/core/rooms';
import type { Plan, Vec2 } from '@/core/types';
import { THEME_PALETTE, type SnapshotPalette } from './snapshotPalette';

const pts = (ps: readonly Vec2[]) =>
  ps.map((p) => `${p.x.toFixed(3)},${(-p.y).toFixed(3)}`).join(' ');

/** Static SVG of a plan (rooms, walls, openings) — for thumbnails and print. */
export function PlanSnapshot({
  plan,
  className,
  labels = false,
  palette = THEME_PALETTE,
}: {
  plan: Plan;
  className?: string;
  labels?: boolean;
  palette?: SnapshotPalette;
}) {
  const { rooms, joins, box } = useMemo(() => {
    const all = plan.walls.flatMap((w) => [w.start, w.end]);
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const pad = 0.6;
    return {
      rooms: resolveRooms(detectRooms(plan.walls), plan.rooms),
      joins: endpointJoins(plan.walls),
      box: all.length
        ? {
            x: Math.min(...xs) - pad,
            y: -Math.max(...ys) - pad,
            w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
            h: Math.max(...ys) - Math.min(...ys) + 2 * pad,
          }
        : { x: -4, y: -3, w: 8, h: 6 },
    };
  }, [plan.walls, plan.rooms]);
  const walls = new Map(plan.walls.map((w) => [w.id, w]));

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      className={className}
      role="img"
      aria-label="Floor plan"
    >
      {rooms.map((r) => (
        <polygon
          key={r.key}
          points={pts(r.polygon)}
          fill={getMaterial(r.meta?.floorMaterial)?.colorHex ?? palette.room}
          opacity={0.75}
        />
      ))}
      {plan.walls.map((w) => (
        <polygon key={w.id} points={pts(wallFootprint(w, joins.get(w.id)))} fill={palette.wall} />
      ))}
      {plan.openings.map((o) => {
        const w = walls.get(o.wallId);
        if (!w) return null;
        const span = openingSpan(o, w);
        const n = scale(perp(wallDirection(w)), w.thickness / 2 + 0.01);
        return (
          <polygon
            key={o.id}
            points={pts([
              add(span.start, n),
              add(span.end, n),
              sub(span.end, n),
              sub(span.start, n),
            ])}
            fill={o.type === 'window' ? '#bfe3f5' : palette.gap}
          />
        );
      })}
      {labels &&
        rooms.map((r) => (
          <text
            key={`l-${r.key}`}
            x={r.labelAt.x}
            y={-r.labelAt.y}
            fontSize={Math.max(0.22, box.w / 40)}
            textAnchor="middle"
            fill="#1f2937"
            fontFamily="Inter Variable, sans-serif"
            fontWeight={600}
          >
            {r.name}
          </text>
        ))}
    </svg>
  );
}
