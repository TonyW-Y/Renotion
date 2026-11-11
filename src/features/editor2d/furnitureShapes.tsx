import { Circle, Group, Line, Rect } from 'react-konva';
import { furnitureFootprint, modelFor } from '@/core/furniture/placement';
import type { FurnitureItem } from '@/core/types';
import type { Selection } from '@/state/uiStore';
import { rotateHandleAt } from './useCanvasInteraction';
import type { CanvasColors } from './useThemeColors';
import { flat, toScreen, type View } from './viewport';

interface ItemProps {
  item: FurnitureItem;
  view: View;
  colors: CanvasColors;
  outline?: string | undefined;
  opacity?: number;
}

/** One furniture item in plan view, drawn from its model's parts. */
function FurnitureItemShape({ item, view, colors, outline, opacity = 1 }: ItemProps) {
  const model = modelFor(item);
  const fp = furnitureFootprint(item);
  if (!model || !fp) return null;
  const s = view.s;
  const at = toScreen(item.position, view);
  // Lower parts first so the top-most surfaces win.
  const parts = [...model.parts].sort(
    (a, b) => a.position[1] + a.size[1] / 2 - (b.position[1] + b.size[1] / 2),
  );
  return (
    <Group opacity={opacity}>
      {/* Screen y points down, so a CCW plan rotation is a negative screen rotation. */}
      <Group x={at.x} y={at.y} rotation={(-item.rotation * 180) / Math.PI}>
        {parts.map((p, i) => {
          const [w, , d] = p.size;
          const [x, , z] = p.position;
          return p.shape === 'box' ? (
            <Rect
              key={i}
              x={(x - w / 2) * s}
              y={(z - d / 2) * s}
              width={w * s}
              height={d * s}
              cornerRadius={Math.min(w, d) * s * 0.08}
              fill={p.color}
              stroke="rgba(0,0,0,0.22)"
              strokeWidth={0.75}
              perfectDrawEnabled={false}
            />
          ) : (
            <Circle
              key={i}
              x={x * s}
              y={z * s}
              radius={(w / 2) * s}
              fill={p.color}
              stroke="rgba(0,0,0,0.22)"
              strokeWidth={0.75}
              perfectDrawEnabled={false}
            />
          );
        })}
      </Group>
      {outline && (
        <Line
          points={flat(fp, view)}
          closed
          stroke={outline}
          strokeWidth={1.75}
          dash={[5, 3]}
          listening={false}
        />
      )}
      {!outline && (
        <Line points={flat(fp, view)} closed stroke={colors.border} strokeWidth={0.75} />
      )}
    </Group>
  );
}

interface FurnitureShapesProps {
  items: readonly FurnitureItem[];
  view: View;
  colors: CanvasColors;
  selection: Selection | null;
  hover: Selection | null;
  danger?: boolean;
}

export function FurnitureShapes({
  items,
  view,
  colors,
  selection,
  hover,
  danger = false,
}: FurnitureShapesProps) {
  // Low pieces (rugs) first so taller furniture sits on top of them in plan view.
  const ordered = [...items].sort(
    (a, b) => (modelFor(a)?.height ?? 0) - (modelFor(b)?.height ?? 0),
  );
  return (
    <>
      {ordered.map((item) => {
        const selected = selection?.kind === 'furniture' && selection.id === item.id;
        const hovered = hover?.kind === 'furniture' && hover.id === item.id;
        const outline = selected
          ? colors.accent
          : hovered
            ? danger
              ? colors.danger
              : colors.accent
            : undefined;
        return (
          <FurnitureItemShape
            key={item.id}
            item={item}
            view={view}
            colors={colors}
            outline={outline}
          />
        );
      })}
    </>
  );
}

/** Ghost of an item being placed: tinted red where it would overlap a wall. */
export function FurnitureGhostShape({
  item,
  valid,
  view,
  colors,
}: {
  item: FurnitureItem;
  valid: boolean;
  view: View;
  colors: CanvasColors;
}) {
  const fp = furnitureFootprint(item);
  return (
    <>
      <FurnitureItemShape
        item={item}
        view={view}
        colors={colors}
        opacity={0.75}
        outline={valid ? colors.accent : colors.danger}
      />
      {!valid && fp && <Line points={flat(fp, view)} closed fill={colors.danger} opacity={0.22} />}
    </>
  );
}

/** Rotation handle shown in front of the selected item. */
export function RotateHandle({
  item,
  view,
  colors,
}: {
  item: FurnitureItem;
  view: View;
  colors: CanvasColors;
}) {
  const h = rotateHandleAt(item);
  if (!h) return null;
  const a = toScreen(item.position, view);
  const b = toScreen(h, view);
  return (
    <>
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke={colors.accent}
        strokeWidth={1}
        dash={[3, 3]}
        opacity={0.7}
      />
      <Circle
        x={b.x}
        y={b.y}
        radius={6}
        fill={colors.surface}
        stroke={colors.accent}
        strokeWidth={2}
      />
      <Circle x={b.x} y={b.y} radius={2} fill={colors.accent} />
    </>
  );
}
