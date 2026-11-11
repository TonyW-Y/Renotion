import { Fragment } from 'react';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import { angle, add, normalize, scale, perp, sub } from '@/core/geometry/vec2';
import { openingSpan, wallDirection, wallFootprint, wallLength } from '@/core/geometry/walls';
import type { EndpointJoins } from '@/core/geometry/wallGraph';
import { openingStyleOf } from '@/core/openings';
import type { ResolvedRoom } from '@/core/rooms';
import type { ID, Opening, Vec2, Wall } from '@/core/types';
import { getMaterial } from '@/core/estimate/defaultCosts';
import { formatArea, formatLength, type UnitSystem } from '@/core/units';
import type { Selection } from '@/state/uiStore';
import { patternKey } from '@/features/materials/tint';
import type { PatternImage } from './usePatternImages';
import type { CanvasColors } from './useThemeColors';
import { flat, toScreen, type View } from './viewport';

export const FONT_SANS = 'Inter Variable, ui-sans-serif, system-ui, sans-serif';
export const FONT_MONO = 'JetBrains Mono Variable, ui-monospace, monospace';

const isSel = (s: Selection | null, kind: Selection['kind'], id: string) =>
  s?.kind === kind && s.id === id;

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

interface RoomsProps {
  rooms: readonly ResolvedRoom[];
  view: View;
  colors: CanvasColors;
  selection: Selection | null;
  hover: Selection | null;
  units: UnitSystem;
}

/** Room fills. With `behind`, they are composited under what's already drawn (walls). */
export function RoomShapes({
  rooms,
  view,
  colors,
  selection,
  hover,
  behind = false,
  patterns,
}: Omit<RoomsProps, 'units'> & {
  behind?: boolean;
  patterns?: ReadonlyMap<string, PatternImage>;
}) {
  const op = behind ? 'destination-over' : 'source-over';
  return (
    <>
      {rooms.map((r) => {
        const selected = isSel(selection, 'room', r.key);
        const hovered = isSel(hover, 'room', r.key);
        const points = flat(r.polygon, view);
        const finish = getMaterial(r.meta?.floorMaterial);
        const img = finish?.textureSet
          ? patterns?.get(patternKey(finish.textureSet, r.meta?.floorTint))
          : undefined;
        const k = img && finish?.tileSize ? (finish.tileSize * view.s) / img.width : 1;
        // In destination-over mode, shapes drawn later end up underneath:
        // draw the highlight first so it sits on top of the floor finish.
        return (
          <Fragment key={r.key}>
            {(selected || hovered) && (
              <Line
                points={points}
                closed
                fill={colors.accentSoft}
                stroke={selected ? colors.accent : 'transparent'}
                strokeWidth={selected ? 1.5 : 0}
                dash={[6, 4]}
                perfectDrawEnabled={false}
                globalCompositeOperation={op}
              />
            )}
            {img ? (
              <Line
                points={points}
                closed
                // Konva draws canvases too; its typings only mention images.
                fillPatternImage={img as HTMLImageElement}
                fillPatternRepeat="repeat"
                fillPatternScale={{ x: k, y: k }}
                fillPatternX={view.ox}
                fillPatternY={view.oy}
                opacity={0.92}
                perfectDrawEnabled={false}
                globalCompositeOperation={op}
              />
            ) : (
              <Line
                points={points}
                closed
                fill={r.meta?.floorTint ?? finish?.colorHex ?? colors.room}
                opacity={finish ? 0.8 : 1}
                perfectDrawEnabled={false}
                globalCompositeOperation={op}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/** Thin colour strips along painted wall faces. */
export function PaintStrips({ walls, view }: { walls: readonly Wall[]; view: View }) {
  const strips: { key: string; pts: Vec2[]; color: string }[] = [];
  for (const w of walls) {
    const dir = wallDirection(w);
    const n = perp(dir);
    for (const [side, sign] of [
      ['a', 1],
      ['b', -1],
    ] as const) {
      const color =
        (side === 'a' ? w.tintA : w.tintB) ??
        getMaterial(side === 'a' ? w.finishA : w.finishB)?.colorHex;
      if (!color) continue;
      const off = scale(n, sign * (w.thickness / 2 - 2.5 / view.s));
      strips.push({ key: `${w.id}${side}`, pts: [add(w.start, off), add(w.end, off)], color });
    }
  }
  return (
    <>
      {strips.map((s) => (
        <Line
          key={s.key}
          points={flat(s.pts, view)}
          stroke={s.color}
          strokeWidth={4}
          lineCap="butt"
        />
      ))}
    </>
  );
}

export function RoomLabels({
  rooms,
  view,
  colors,
  units,
}: Omit<RoomsProps, 'selection' | 'hover'>) {
  if (view.s < 30) return null;
  return (
    <>
      {rooms.map((r) => {
        const p = toScreen(r.labelAt, view);
        const area = formatArea(r.area, units);
        const w = Math.max(r.name.length * 7.4, area.length * 6.9) + 20;
        return (
          <Group key={r.key} x={p.x} y={p.y}>
            <Rect
              x={-w / 2}
              y={-21}
              width={w}
              height={40}
              cornerRadius={10}
              fill={colors.surface}
              opacity={0.82}
              shadowColor="black"
              shadowOpacity={0.12}
              shadowBlur={6}
            />
            <Text
              text={r.name}
              x={-90}
              y={-14}
              width={180}
              align="center"
              fontFamily={FONT_SANS}
              fontSize={13}
              fontStyle="600"
              fill={colors.fg}
            />
            <Text
              text={area}
              x={-90}
              y={3}
              width={180}
              align="center"
              fontFamily={FONT_MONO}
              fontSize={11}
              fill={colors.fgMuted}
            />
          </Group>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Walls                                                               */
/* ------------------------------------------------------------------ */

interface WallsProps {
  walls: readonly Wall[];
  joins: Map<ID, EndpointJoins>;
  view: View;
  colors: CanvasColors;
  selection: Selection | null;
  hover: Selection | null;
  danger?: boolean;
  /** 'base' draws every wall; 'highlight' draws hover / selection on top. */
  pass: 'base' | 'highlight';
}

export function WallShapes({
  walls,
  joins,
  view,
  colors,
  selection,
  hover,
  danger = false,
  pass,
}: WallsProps) {
  if (pass === 'base') {
    // All walls share one fill so overlapping corners merge seamlessly.
    return (
      <>
        {walls.map((w) => (
          <Line
            key={w.id}
            points={flat(wallFootprint(w, joins.get(w.id)), view)}
            closed
            fill={colors.wall}
            perfectDrawEnabled={false}
          />
        ))}
      </>
    );
  }
  const highlighted = (w: Wall) => isSel(selection, 'wall', w.id) || isSel(hover, 'wall', w.id);
  return (
    <>
      {walls.filter(highlighted).map((w) => {
        const selected = isSel(selection, 'wall', w.id);
        const tint = danger && !selected ? colors.danger : colors.accent;
        return (
          <Line
            key={`hl-${w.id}`}
            points={flat(wallFootprint(w, joins.get(w.id)), view)}
            closed
            fill={selected ? tint : 'transparent'}
            opacity={selected ? 0.9 : 1}
            stroke={tint}
            strokeWidth={selected ? 0 : 2}
            perfectDrawEnabled={false}
          />
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Openings                                                            */
/* ------------------------------------------------------------------ */

function arcPoints(center: Vec2, radius: number, a0: number, a1: number, steps = 18): Vec2[] {
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + (d * i) / steps;
    return { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius };
  });
}

interface OpeningProps {
  opening: Opening;
  wall: Wall;
  view: View;
  colors: CanvasColors;
  /** Override stroke (selection / ghost states). */
  tint?: string;
  ghost?: boolean;
}

function cutPolygon(opening: Pick<Opening, 'offset' | 'width'>, wall: Wall): Vec2[] {
  const span = openingSpan(opening, wall);
  const n = scale(perp(wallDirection(wall)), wall.thickness / 2 + 0.002);
  return [add(span.start, n), add(span.end, n), sub(span.end, n), sub(span.start, n)];
}

/** Erases the wall where openings are, so the room fill / grid shows through. */
export function OpeningCuts({
  openings,
  walls,
  view,
}: {
  openings: readonly Opening[];
  walls: readonly Wall[];
  view: View;
}) {
  const byId = new Map(walls.map((w) => [w.id, w]));
  return (
    <>
      {openings.map((o) => {
        const w = byId.get(o.wallId);
        return w ? (
          <Line
            key={o.id}
            points={flat(cutPolygon(o, w), view)}
            closed
            fill="#000"
            globalCompositeOperation="destination-out"
          />
        ) : null;
      })}
    </>
  );
}

export function OpeningShape({ opening, wall, view, colors, tint, ghost = false }: OpeningProps) {
  const span = openingSpan(opening, wall);
  const dir = wallDirection(wall);
  const n = perp(dir);
  const half = wall.thickness / 2;
  const cut = cutPolygon(opening, wall);
  const style = openingStyleOf(opening);
  const line = tint ?? colors.fgMuted;
  const leafColor = tint ?? opening.color ?? colors.fg;
  const sw = Math.max(1, Math.min(1.75, view.s / 60));
  const at = (u: number, v = 0) => add(add(span.start, scale(dir, u)), scale(n, v));
  const w = opening.width;

  if (opening.type === 'window') {
    const glass = tint ?? colors.accent2;
    const frame = tint ?? opening.color ?? line;
    const g = Math.min(half * 0.35, 0.03);
    return (
      <Group opacity={ghost ? 0.85 : 1}>
        <Line
          points={flat(cut, view)}
          closed
          fill={ghost ? colors.canvas : 'transparent'}
          stroke={frame}
          strokeWidth={opening.color && !tint ? sw * 1.4 : sw}
        />
        {style === 'double-hung' || style === 'slider' ? (
          <>
            <Line
              points={flat([at(0, g), at(style === 'slider' ? w * 0.55 : w, g)], view)}
              stroke={glass}
              strokeWidth={sw * 1.2}
            />
            <Line
              points={flat([at(style === 'slider' ? w * 0.45 : 0, -g), at(w, -g)], view)}
              stroke={glass}
              strokeWidth={sw * 1.2}
            />
          </>
        ) : (
          <Line
            points={flat([span.start, span.end], view)}
            stroke={glass}
            strokeWidth={style === 'picture' ? sw * 2.4 : sw * 1.5}
          />
        )}
        {style === 'casement' && (
          <Line
            points={flat([at(w / 2, -half), at(w / 2, half)], view)}
            stroke={frame}
            strokeWidth={sw}
          />
        )}
        {style === 'grid' &&
          [1 / 3, 2 / 3].map((k) => (
            <Line
              key={k}
              points={flat([at(w * k, -g * 1.5), at(w * k, g * 1.5)], view)}
              stroke={frame}
              strokeWidth={sw}
            />
          ))}
        {style === 'bay' && (
          <Line
            points={flat(
              [
                at(-0.08, -half - 0.12),
                at(w + 0.08, -half - 0.12),
                at(w + 0.08, half + 0.12),
                at(-0.08, half + 0.12),
              ],
              view,
            )}
            closed
            stroke={frame}
            strokeWidth={sw * 0.8}
            dash={[3, 3]}
          />
        )}
      </Group>
    );
  }

  const jambs = (
    <>
      <Line points={flat([at(0, half), at(0, -half)], view)} stroke={line} strokeWidth={sw} />
      <Line points={flat([at(w, half), at(w, -half)], view)} stroke={line} strokeWidth={sw} />
    </>
  );
  const ghostFill = ghost && (
    <Line points={flat(cut, view)} closed fill={colors.canvas} opacity={0.7} />
  );

  if (style === 'barn') {
    // A slab sliding along side A's face, with its travel shown dashed.
    const v = half + 0.035;
    return (
      <Group opacity={ghost ? 0.85 : 1}>
        {ghostFill}
        {jambs}
        <Line
          points={flat([at(-0.06, v), at(w + 0.06, v)], view)}
          stroke={leafColor}
          strokeWidth={sw * 2.2}
          lineCap="round"
        />
        <Line
          points={flat([at(w + 0.06, v + 0.04), at(w * 2, v + 0.04)], view)}
          stroke={line}
          strokeWidth={sw * 0.8}
          dash={[4, 3]}
          opacity={0.8}
        />
      </Group>
    );
  }

  if (style === 'pet') {
    return (
      <Group opacity={ghost ? 0.85 : 1}>
        {ghostFill}
        {jambs}
        <Line
          points={flat([at(0), at(w)], view)}
          stroke={leafColor}
          strokeWidth={sw * 2}
          lineCap="round"
        />
      </Group>
    );
  }

  const sign = opening.swing === 'b' ? -1 : 1;
  const face = scale(n, sign * half);
  /** One swinging leaf hinged at `hinge`, closing towards `other`. */
  const leaf = (hinge: Vec2, other: Vec2, radius: number, key: string) => {
    const hingeFace = add(hinge, face);
    const otherFace = add(add(hinge, scale(normalize(sub(other, hinge)), radius)), face);
    const leafEnd = add(hingeFace, scale(n, sign * radius));
    const arc = arcPoints(
      hingeFace,
      radius,
      angle(sub(leafEnd, hingeFace)),
      angle(sub(otherFace, hingeFace)),
    );
    return (
      <Fragment key={key}>
        <Line
          points={flat(arc, view)}
          stroke={line}
          strokeWidth={sw * 0.8}
          dash={[4, 3]}
          opacity={0.8}
        />
        <Line
          points={flat([hingeFace, leafEnd], view)}
          stroke={style === 'glass' && !tint ? colors.accent2 : leafColor}
          strokeWidth={sw * 1.6}
          lineCap="round"
        />
      </Fragment>
    );
  };

  const hingeAtEnd = opening.hinge === 'end';
  return (
    <Group opacity={ghost ? 0.85 : 1}>
      {ghostFill}
      {style === 'double'
        ? [leaf(span.start, span.end, w / 2, 'l'), leaf(span.end, span.start, w / 2, 'r')]
        : hingeAtEnd
          ? leaf(span.end, span.start, w, 'one')
          : leaf(span.start, span.end, w, 'one')}
      {jambs}
    </Group>
  );
}

interface OpeningsProps {
  openings: readonly Opening[];
  walls: readonly Wall[];
  view: View;
  colors: CanvasColors;
  selection: Selection | null;
  hover: Selection | null;
  danger?: boolean;
}

export function OpeningShapes({
  openings,
  walls,
  view,
  colors,
  selection,
  hover,
  danger = false,
}: OpeningsProps) {
  const byId = new Map(walls.map((w) => [w.id, w]));
  return (
    <>
      {openings.map((o) => {
        const wall = byId.get(o.wallId);
        if (!wall) return null;
        const selected = isSel(selection, 'opening', o.id);
        const hovered = isSel(hover, 'opening', o.id);
        const tint =
          selected || hovered ? (danger && !selected ? colors.danger : colors.accent) : undefined;
        return (
          <Fragment key={o.id}>
            <OpeningShape
              opening={o}
              wall={wall}
              view={view}
              colors={colors}
              {...(tint ? { tint } : {})}
            />
          </Fragment>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

interface LabelProps {
  at: Vec2;
  text: string;
  colors: CanvasColors;
  /** Rotation in degrees (screen space). */
  rotation?: number;
  accent?: boolean;
}

/** A small pill-shaped measurement label, centred on `at` (screen px). */
export function Pill({ at, text, colors, rotation = 0, accent = false }: LabelProps) {
  const fontSize = 11;
  const w = text.length * fontSize * 0.62 + 12;
  const h = 20;
  return (
    <Group x={at.x} y={at.y} rotation={rotation}>
      <Rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        cornerRadius={h / 2}
        fill={accent ? colors.accent : colors.surface}
        stroke={accent ? 'transparent' : colors.border}
        strokeWidth={1}
        shadowColor="black"
        shadowOpacity={0.18}
        shadowBlur={8}
        shadowOffsetY={2}
      />
      <Text
        text={text}
        x={-w / 2}
        y={-h / 2 + 4.5}
        width={w}
        align="center"
        fontFamily={FONT_MONO}
        fontSize={fontSize}
        fontStyle="500"
        fill={accent ? '#fff' : colors.fg}
      />
    </Group>
  );
}

/** Length label placed beside a segment (on side A), kept upright. */
export function SegmentDimension({
  a,
  b,
  offset,
  view,
  colors,
  units,
  accent = false,
}: {
  a: Vec2;
  b: Vec2;
  /** Offset from the centreline in metres (positive = side A). */
  offset: number;
  view: View;
  colors: CanvasColors;
  units: UnitSystem;
  accent?: boolean;
}) {
  const len = wallLength({ start: a, end: b });
  if (len < 0.01) return null;
  const dir = wallDirection({ start: a, end: b });
  const mid = add(scale(add(a, b), 0.5), scale(perp(dir), offset + 18 / view.s));
  let deg = (-angle(dir) * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;
  return (
    <Pill
      at={toScreen(mid, view)}
      text={formatLength(len, units)}
      colors={colors}
      rotation={deg}
      accent={accent}
    />
  );
}

export function Handle({
  at,
  colors,
  active = false,
}: {
  at: Vec2;
  colors: CanvasColors;
  active?: boolean;
}) {
  return (
    <Circle
      x={at.x}
      y={at.y}
      radius={active ? 6.5 : 5.5}
      fill={colors.surface}
      stroke={colors.accent}
      strokeWidth={2}
      shadowColor={colors.accent}
      shadowBlur={active ? 10 : 0}
      shadowOpacity={0.6}
    />
  );
}
