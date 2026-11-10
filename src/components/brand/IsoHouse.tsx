import { motion } from 'motion/react';
import { useId, useMemo } from 'react';
import { cn } from '@/lib/cn';

/**
 * A small isometric "dollhouse" floor plan whose walls rise into place.
 * Purely decorative, drawn from plan-space coordinates (metres) the same way
 * the real 3D view will be derived from the 2D plan.
 */

type P3 = [x: number, y: number, z: number];
type Seg = [x1: number, y1: number, x2: number, y2: number];

const SCALE = 30;
const WALL_H = 1.25;
const COS30 = Math.cos(Math.PI / 6);

const WALLS: Seg[] = [
  [0, 0, 7.2, 0],
  [7.2, 0, 7.2, 5.4],
  [0, 0, 0, 5.4],
  [0, 5.4, 2.2, 5.4],
  [3.3, 5.4, 7.2, 5.4],
  [4.2, 0, 4.2, 1.6],
  [4.2, 2.5, 4.2, 5.4],
  [4.2, 3.2, 5.6, 3.2],
  [6.4, 3.2, 7.2, 3.2],
];

const ROOMS: { pts: [number, number][]; tone: 'a' | 'b' | 'c' }[] = [
  {
    pts: [
      [0, 0],
      [4.2, 0],
      [4.2, 5.4],
      [0, 5.4],
    ],
    tone: 'a',
  },
  {
    pts: [
      [4.2, 0],
      [7.2, 0],
      [7.2, 3.2],
      [4.2, 3.2],
    ],
    tone: 'b',
  },
  {
    pts: [
      [4.2, 3.2],
      [7.2, 3.2],
      [7.2, 5.4],
      [4.2, 5.4],
    ],
    tone: 'c',
  },
];

const project = ([x, y, z]: P3): [number, number] => [
  (x - y) * COS30 * SCALE,
  ((x + y) * 0.5 - z) * SCALE,
];

const pt = (p: P3) =>
  project(p)
    .map((n) => n.toFixed(2))
    .join(' ');
const poly = (pts: P3[]) => `M${pts.map(pt).join(' L')} Z`;

function wallFace([x1, y1, x2, y2]: Seg, h: number) {
  return poly([
    [x1, y1, 0],
    [x2, y2, 0],
    [x2, y2, h],
    [x1, y1, h],
  ]);
}

interface IsoHouseProps {
  className?: string;
  /** Delay before the build animation starts (seconds). */
  delay?: number;
}

export function IsoHouse({ className, delay = 0 }: IsoHouseProps) {
  const gid = useId();

  const viewBox = useMemo(() => {
    const all = WALLS.flatMap(([x1, y1, x2, y2]) => [
      project([x1, y1, 0]),
      project([x2, y2, WALL_H]),
      project([x1, y1, WALL_H]),
      project([x2, y2, 0]),
    ]);
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    const pad = 36;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    return `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}`;
  }, []);

  // Dimension line along the south wall, offset outward.
  const dimA = project([0, -0.9, 0]);
  const dimB = project([7.2, -0.9, 0]);
  const dimMid = project([3.6, -1.35, 0]);

  return (
    <svg
      viewBox={viewBox}
      className={cn('h-auto w-full overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${gid}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--accent-2)" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Floors */}
      {ROOMS.map((room, i) => (
        <motion.path
          key={i}
          d={poly(room.pts.map(([x, y]) => [x, y, 0]))}
          fill={
            room.tone === 'a'
              ? 'var(--accent)'
              : room.tone === 'b'
                ? 'var(--accent-2)'
                : 'var(--fg)'
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: room.tone === 'c' ? 0.05 : 0.1 }}
          transition={{ delay: delay + 0.9 + i * 0.12, duration: 0.8 }}
        />
      ))}

      {/* Plan lines drawn first */}
      {WALLS.map(([x1, y1, x2, y2], i) => (
        <motion.path
          key={`base-${i}`}
          d={`M${pt([x1, y1, 0])} L${pt([x2, y2, 0])}`}
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ delay: delay + i * 0.06, duration: 0.5, ease: 'easeOut' }}
        />
      ))}

      {/* Walls rise */}
      {WALLS.map((w, i) => (
        <motion.path
          key={`wall-${i}`}
          fill={`url(#${gid}-wall)`}
          stroke="var(--accent)"
          strokeOpacity={0.75}
          strokeWidth={1}
          strokeLinejoin="round"
          initial={{ d: wallFace(w, 0) }}
          animate={{ d: wallFace(w, WALL_H) }}
          transition={{
            delay: delay + 0.7 + i * 0.05,
            type: 'spring',
            bounce: 0.25,
            duration: 0.9,
          }}
        />
      ))}

      {/* Dimension line */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 1.6, duration: 0.6 }}
        stroke="var(--fg-subtle)"
        strokeWidth={1}
      >
        <line x1={dimA[0]} y1={dimA[1]} x2={dimB[0]} y2={dimB[1]} strokeDasharray="3 3" />
        <circle cx={dimA[0]} cy={dimA[1]} r={2} fill="var(--fg-subtle)" />
        <circle cx={dimB[0]} cy={dimB[1]} r={2} fill="var(--fg-subtle)" />
        <text
          x={dimMid[0]}
          y={dimMid[1]}
          fill="var(--fg-muted)"
          stroke="none"
          fontSize={11}
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          transform={`rotate(30 ${dimMid[0]} ${dimMid[1]})`}
        >
          7.20 m
        </text>
      </motion.g>
    </svg>
  );
}
