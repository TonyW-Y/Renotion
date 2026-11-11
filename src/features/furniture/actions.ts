import { setFurnitureProps } from '@/core/commands';
import { canPlaceFurniture, normalizeAngle } from '@/core/furniture/placement';
import { createId } from '@/lib/id';
import { selectActivePlan, usePlanStore } from '@/state/planStore';
import { useUiStore } from '@/state/uiStore';

/** Rotates the selected furniture (or the item being placed) by `delta` radians. */
export function rotateFurniture(delta: number): boolean {
  const ui = useUiStore.getState();
  if (ui.tool === 'furniture' && ui.placing) {
    ui.rotatePlacing(delta);
    return true;
  }
  if (ui.selection?.kind !== 'furniture') return false;
  const plan = selectActivePlan(usePlanStore.getState());
  const item = plan.furniture.find((f) => f.id === ui.selection?.id);
  if (!item) return false;
  const rotation = normalizeAngle(item.rotation + delta);
  if (!canPlaceFurniture({ ...item, rotation }, plan)) return true; // blocked by a wall
  usePlanStore.getState().execute(setFurnitureProps(plan, item.id, { rotation }));
  return true;
}

/** Duplicates the selected furniture next to the original and selects the copy. */
export function duplicateFurniture(): boolean {
  const ui = useUiStore.getState();
  if (ui.selection?.kind !== 'furniture') return false;
  const plan = selectActivePlan(usePlanStore.getState());
  const item = plan.furniture.find((f) => f.id === ui.selection?.id);
  if (!item) return false;
  for (const [dx, dy] of [
    [0.3, -0.3],
    [0.6, 0],
    [-0.6, 0],
    [0, 0.6],
    [0, -0.6],
  ] as const) {
    const copy = {
      ...item,
      id: createId(),
      position: { x: item.position.x + dx, y: item.position.y + dy },
    };
    if (canPlaceFurniture(copy, plan)) {
      usePlanStore.getState().execute({ type: 'addFurniture', item: copy });
      ui.select({ kind: 'furniture', id: copy.id });
      return true;
    }
  }
  return true;
}
