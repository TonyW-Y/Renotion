import { Copy, Link2, RotateCcw, RotateCw, Trash2, Unlink2 } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  CommitInput,
  Field,
  IconButton,
  LengthInput,
  PanelSection,
  Tooltip,
} from '@/components/ui';
import { setFurnitureProps } from '@/core/commands';
import { FURNITURE_BY_ID } from '@/core/furniture/catalog';
import {
  canPlaceFurniture,
  clampFurnitureSize,
  furniturePalette,
  modelFor,
  normalizeAngle,
  sizeFactor,
} from '@/core/furniture/placement';
import type { FurnitureItem, FurnitureSize, Plan } from '@/core/types';
import type { UnitSystem } from '@/core/units';
import { ColorSwatches } from '@/features/materials/ColorSwatches';
import { formatMoneyWhole } from '@/lib/format';
import { duplicateFurniture, rotateFurniture } from '@/features/furniture/actions';
import { TopView } from '@/features/furniture/TopView';
import { MOD } from '@/lib/platform';
import { usePlanStore } from '@/state/planStore';
import { useUiStore } from '@/state/uiStore';

const DIM_LABELS = { width: 'Width', depth: 'Depth', height: 'Height' } as const;

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
  const [lockRatio, setLockRatio] = useState(true);
  const base = FURNITURE_BY_ID.get(item.modelId);
  const model = modelFor(item);
  if (!base || !model) return null;
  const quarter = Math.PI / 2;
  const size: FurnitureSize = item.size ?? base;
  const palette = furniturePalette(base);
  const price = Math.round(base.price * sizeFactor(item));

  /** Applies a size (null = catalogue size); refuses sizes that hit a wall. */
  const commitSize = (next: FurnitureSize | null): boolean => {
    const same =
      next !== null &&
      Math.abs(next.width - base.width) < 1e-4 &&
      Math.abs(next.depth - base.depth) < 1e-4 &&
      Math.abs(next.height - base.height) < 1e-4;
    const value = next === null || same ? null : next;
    if (!canPlaceFurniture({ ...item, ...(value ? { size: value } : { size: base }) }, plan))
      return false;
    execute(setFurnitureProps(plan, item.id, { size: value }));
    return true;
  };

  const resize = (dim: keyof FurnitureSize, v: number): boolean => {
    const k = v / size[dim];
    const next = lockRatio
      ? { width: size.width * k, depth: size.depth * k, height: size.height * k }
      : { ...size, [dim]: v };
    return commitSize(clampFurnitureSize(base, next));
  };

  const recolor = (role: 'primary' | 'secondary', hex: string | null) => {
    const colors = Object.fromEntries(
      Object.entries({ ...item.colors, [role]: hex ?? undefined }).filter(([, v]) => v),
    );
    execute(
      setFurnitureProps(plan, item.id, {
        colors: Object.keys(colors).length ? colors : null,
      }),
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-fg/[0.04] p-1.5">
          <TopView model={model} className="max-h-full max-w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{model.name}</p>
          <p className="truncate text-xs text-fg-subtle">{model.category}</p>
        </div>
        <div className="text-right">
          <p className="tabular text-accent-gradient text-sm font-semibold">
            {formatMoneyWhole(price)}
          </p>
          <p className="text-[11px] text-fg-subtle">if added</p>
        </div>
      </div>
      <PanelSection
        title="Size"
        className="border-b-0"
        action={
          <div className="flex items-center gap-1">
            {item.size && (
              <Button variant="ghost" size="sm" onClick={() => commitSize(null)}>
                Reset
              </Button>
            )}
            <Tooltip content={lockRatio ? 'Proportions locked' : 'Proportions unlocked'}>
              <IconButton
                label={lockRatio ? 'Unlock proportions' : 'Lock proportions'}
                size="sm"
                aria-pressed={lockRatio}
                className={lockRatio ? 'text-accent' : undefined}
                onClick={() => {
                  setLockRatio((v) => !v);
                }}
              >
                {lockRatio ? <Link2 className="size-3.5" /> : <Unlink2 className="size-3.5" />}
              </IconButton>
            </Tooltip>
          </div>
        }
      >
        {(['width', 'depth', 'height'] as const).map((dim) => (
          <Field key={dim} label={DIM_LABELS[dim]}>
            <LengthInput
              label={`Furniture ${dim}`}
              value={size[dim]}
              units={units}
              min={0.05}
              onChange={(v) => resize(dim, v)}
            />
          </Field>
        ))}
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          {item.size
            ? `${Math.round((size.width / base.width) * 100)}% × ${Math.round((size.depth / base.depth) * 100)}% × ${Math.round((size.height / base.height) * 100)}% of catalogue size`
            : 'Catalogue size · 50%–200% allowed'}
        </p>
      </PanelSection>
      {(palette.primary ?? palette.secondary) && (
        <PanelSection title="Colour" className="border-b-0 pt-0">
          {palette.primary && (
            <div className="space-y-1.5">
              <p className="text-xs text-fg-muted">Main</p>
              <ColorSwatches
                label="Main colour"
                value={item.colors?.primary}
                original={palette.primary}
                onChange={(hex) => recolor('primary', hex)}
              />
            </div>
          )}
          {palette.secondary && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-fg-muted">Accent</p>
              <ColorSwatches
                label="Accent colour"
                value={item.colors?.secondary}
                original={palette.secondary}
                onChange={(hex) => recolor('secondary', hex)}
              />
            </div>
          )}
        </PanelSection>
      )}
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
