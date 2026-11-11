import { Copy, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { Button, CommitInput, Field, PanelSection, PropRow } from '@/components/ui';
import { setFurnitureProps } from '@/core/commands';
import { FURNITURE_BY_ID } from '@/core/furniture/catalog';
import { canPlaceFurniture, normalizeAngle } from '@/core/furniture/placement';
import type { FurnitureItem, Plan } from '@/core/types';
import { formatLength, type UnitSystem } from '@/core/units';
import { duplicateFurniture, rotateFurniture } from '@/features/furniture/actions';
import { TopView } from '@/features/furniture/TopView';
import { MOD } from '@/lib/platform';
import { usePlanStore } from '@/state/planStore';
import { useUiStore } from '@/state/uiStore';

const toDeg = (r: number) => Math.round((normalizeAngle(r) * 180) / Math.PI) % 360;

export function FurnitureInspector({
  item,
  plan,
  units,
}: {
  item: FurnitureItem;
  plan: Plan;
  units: UnitSystem;
}) {
  const execute = usePlanStore((s) => s.execute);
  const select = useUiStore((s) => s.select);
  const model = FURNITURE_BY_ID.get(item.modelId);
  if (!model) return null;
  const quarter = Math.PI / 2;

  return (
    <>
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-fg/[0.04] p-1.5">
          <TopView model={model} className="max-h-full max-w-full" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{model.name}</p>
          <p className="truncate text-xs text-fg-subtle">{model.category}</p>
        </div>
      </div>
      <PanelSection title="Size" className="border-b-0">
        <PropRow
          label="W × D × H"
          value={`${formatLength(model.width, units, { decimals: 2 })} × ${formatLength(model.depth, units, { decimals: 2 })} × ${formatLength(model.height, units, { decimals: 2 })}`}
        />
      </PanelSection>
      <PanelSection title="Placement" className="border-b-0 pt-0">
        <Field label="Rotation">
          <CommitInput
            label="Rotation in degrees"
            mono
            className="w-24 text-right"
            display={`${toDeg(item.rotation)}°`}
            onCommit={(text) => {
              const deg = Number(text.replace('°', '').trim());
              if (!Number.isFinite(deg)) return false;
              const rotation = normalizeAngle((deg * Math.PI) / 180);
              if (!canPlaceFurniture({ ...item, rotation }, plan)) return false;
              execute(setFurnitureProps(plan, item.id, { rotation }));
              return true;
            }}
          />
        </Field>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Rotate left 90°"
            onClick={() => rotateFurniture(quarter)}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Rotate right 90°"
            onClick={() => rotateFurniture(-quarter)}
          >
            <RotateCw className="size-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Duplicate (${MOD}D)`}
            onClick={() => duplicateFurniture()}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-fg-subtle">
          Drag to move · drag the dot to rotate ·{' '}
          <span className="font-medium text-fg-muted">R</span> rotates 90°
        </p>
      </PanelSection>
      <div className="px-4 pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center hover:bg-danger/10 hover:text-danger"
          onClick={() => {
            const index = plan.furniture.findIndex((f) => f.id === item.id);
            execute({ type: 'deleteFurniture', item, index });
            select(null);
          }}
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </>
  );
}
