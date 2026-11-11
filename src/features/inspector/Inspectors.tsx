import {
  ArrowLeftRight,
  DoorOpen,
  FlipVertical2,
  Grid2x2,
  Square,
  SquareDashed,
  Trash2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  setOpeningProps,
  setRoomMeta,
  setWallLength,
  setWallProps,
  deleteOpening,
  deleteWall,
} from '@/core/commands';
import { canPlaceOpening, maxOpeningWidth, wallLength } from '@/core/geometry/walls';
import { MIN_OPENING_SIZE, OPENING_PRESETS, openingStyleOf } from '@/core/openings';
import { getMaterial } from '@/core/estimate/defaultCosts';
import { wallSideRooms } from '@/core/estimate/quantities';
import type { ResolvedRoom } from '@/core/rooms';
import type { Opening, Plan, Wall } from '@/core/types';
import { formatArea, formatLength, type UnitSystem } from '@/core/units';
import {
  Button,
  CommitInput,
  Field,
  LengthInput,
  PanelSection,
  PropRow,
  SegmentedControl,
  Tooltip,
  type SegmentOption,
} from '@/components/ui';
import { ColorSwatches } from '@/features/materials/ColorSwatches';
import {
  CeilingTexturePicker,
  FloorPicker,
  PaintPicker,
  WallTexturePicker,
} from '@/features/materials/MaterialPicker';
import { OpeningDesignPicker } from './OpeningDesignPicker';
import { cn } from '@/lib/cn';
import { usePlanStore } from '@/state/planStore';
import { useUiStore } from '@/state/uiStore';

function Header({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4">
      <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="truncate text-xs text-fg-subtle">{subtitle}</p>
      </div>
    </div>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-center hover:bg-danger/10 hover:text-danger"
      onClick={onClick}
    >
      <Trash2 className="size-3.5" />
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------------ */

export function WallInspector({
  wall,
  plan,
  units,
  rooms,
  side,
}: {
  wall: Wall;
  plan: Plan;
  units: UnitSystem;
  rooms: readonly ResolvedRoom[];
  side?: 'a' | 'b' | undefined;
}) {
  const execute = usePlanStore((s) => s.execute);
  const select = useUiStore((s) => s.select);
  const openings = plan.openings.filter((o) => o.wallId === wall.id);
  const len = wallLength(wall);

  return (
    <>
      <Header
        icon={<Square className="size-4" />}
        title="Wall"
        subtitle={
          openings.length
            ? `${openings.length} opening${openings.length > 1 ? 's' : ''}`
            : 'No openings'
        }
      />
      <PanelSection title="Dimensions" className="border-b-0">
        <Field label="Length">
          <LengthInput
            label="Wall length"
            value={len}
            units={units}
            onChange={(m) => {
              // Don't shrink the wall past its openings.
              const farthest = Math.max(0, ...openings.map((o) => o.offset + o.width / 2 + 0.05));
              if (m < farthest) return false;
              execute(setWallLength(plan, wall.id, m));
              return true;
            }}
          />
        </Field>
        <Field label="Thickness">
          <LengthInput
            label="Wall thickness"
            value={wall.thickness}
            units={units}
            min={0.05}
            max={1}
            onChange={(m) => {
              execute(setWallProps(plan, wall.id, { thickness: m }));
              return true;
            }}
          />
        </Field>
        <Field label="Height">
          <LengthInput
            label="Wall height"
            value={wall.height}
            units={units}
            min={0.5}
            max={10}
            onChange={(m) => {
              const tallest = Math.max(0, ...openings.map((o) => o.sillHeight + o.height));
              if (m < tallest) return false;
              execute(setWallProps(plan, wall.id, { height: m }));
              return true;
            }}
          />
        </Field>
      </PanelSection>
      <WallPaint wall={wall} plan={plan} rooms={rooms} side={side} />
      <div className="px-4 pb-4">
        <DeleteButton
          label="Delete wall"
          onClick={() => {
            execute(deleteWall(plan, wall.id));
            select(null);
          }}
        />
      </div>
    </>
  );
}

function WallPaint({
  wall,
  plan,
  rooms,
  side,
}: {
  wall: Wall;
  plan: Plan;
  rooms: readonly ResolvedRoom[];
  side?: 'a' | 'b' | undefined;
}) {
  const sides = wallSideRooms({ walls: [wall] }, rooms).get(wall.id);
  const facing = (s: 'a' | 'b') => {
    const names = (sides?.[s] ?? [])
      .map((x) => (x.roomKey ? rooms.find((r) => r.key === x.roomKey)?.name : 'Exterior'))
      .filter((n): n is string => !!n);
    return names.length ? names.join(' & ') : 'Exterior';
  };
  return (
    <>
      {(['a', 'b'] as const).map((s) => (
        <PanelSection
          key={s}
          title={`Finish · ${facing(s)}`}
          className={cn('border-b-0 pt-0', side === s && 'rounded-xl bg-accent-soft/40')}
        >
          <WallSideFinish
            key={`${wall.id}:${s}`}
            wall={wall}
            plan={plan}
            side={s}
            facing={facing(s)}
          />
        </PanelSection>
      ))}
    </>
  );
}

const FINISH_MODES: readonly SegmentOption<'paint' | 'texture'>[] = [
  { value: 'paint', label: 'Paint' },
  { value: 'texture', label: 'Texture' },
];

/** Paint or textured finish (with optional recolour) for one side of a wall. */
function WallSideFinish({
  wall,
  plan,
  side,
  facing,
}: {
  wall: Wall;
  plan: Plan;
  side: 'a' | 'b';
  facing: string;
}) {
  const execute = usePlanStore((s) => s.execute);
  const key = side === 'a' ? 'finishA' : 'finishB';
  const tintKey = side === 'a' ? 'tintA' : 'tintB';
  const current = getMaterial(wall[key]);
  const textured = current?.category === 'wallFinish';
  const [mode, setMode] = useState<'paint' | 'texture'>(textured ? 'texture' : 'paint');
  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel={`Finish type facing ${facing}`}
        value={mode}
        className="w-full [&>*]:flex-1"
        options={FINISH_MODES}
        onChange={setMode}
      />
      {mode === 'paint' ? (
        <PaintPicker
          label={`Paint facing ${facing}`}
          value={textured ? undefined : wall[key]}
          onChange={(id) => {
            execute(setWallProps(plan, wall.id, { [key]: id, [tintKey]: null }));
          }}
        />
      ) : (
        <>
          <WallTexturePicker
            label={`Texture facing ${facing}`}
            value={textured ? wall[key] : undefined}
            onChange={(id) => {
              execute(setWallProps(plan, wall.id, { [key]: id, [tintKey]: null }));
            }}
          />
          {textured && (
            <div className="space-y-1.5">
              <p className="text-xs text-fg-muted">Colour</p>
              <ColorSwatches
                label={`Texture colour facing ${facing}`}
                value={wall[tintKey]}
                original={current.colorHex}
                onChange={(hex) => {
                  execute(setWallProps(plan, wall.id, { [tintKey]: hex }));
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TYPE_OPTIONS: readonly SegmentOption<Opening['type']>[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
];

export function OpeningInspector({
  opening,
  wall,
  plan,
  units,
}: {
  opening: Opening;
  wall: Wall;
  plan: Plan;
  units: UnitSystem;
}) {
  const execute = usePlanStore((s) => s.execute);
  const select = useUiStore((s) => s.select);
  const isDoor = opening.type === 'door';
  const fits = (o: Opening) =>
    canPlaceOpening(o, wall, plan.openings, wall.id) && o.sillHeight + o.height <= wall.height;

  return (
    <>
      <Header
        icon={isDoor ? <DoorOpen className="size-4" /> : <Grid2x2 className="size-4" />}
        title={isDoor ? 'Door' : 'Window'}
        subtitle={`On a ${formatLength(wallLength(wall), units)} wall`}
      />
      <PanelSection title="Type" className="border-b-0 pb-0">
        <SegmentedControl
          ariaLabel="Opening type"
          value={opening.type}
          className="w-full [&>*]:flex-1"
          options={TYPE_OPTIONS}
          onChange={(type) => {
            const next =
              type === 'door'
                ? { type, sillHeight: 0, height: Math.min(2.03, wall.height), style: null }
                : {
                    type,
                    sillHeight: 0.9,
                    height: Math.min(1.2, wall.height - 0.9),
                    style: null,
                  };
            execute(setOpeningProps(plan, opening.id, next));
          }}
        />
      </PanelSection>
      <PanelSection title="Design" className="border-b-0 pb-0">
        <OpeningDesignPicker
          opening={opening}
          onChange={(style) => {
            execute(setOpeningProps(plan, opening.id, { style }));
          }}
        />
      </PanelSection>
      <PanelSection title="Dimensions" className="border-b-0">
        <div className="mb-2 grid grid-cols-4 gap-1.5">
          {OPENING_PRESETS[opening.type].map((p) => {
            const next = {
              ...opening,
              width: p.width,
              height: p.height,
              sillHeight: p.sillHeight ?? opening.sillHeight,
            };
            const ok = fits(next);
            const active =
              Math.abs(opening.width - p.width) < 0.005 &&
              Math.abs(opening.height - p.height) < 0.005;
            return (
              <Tooltip
                key={p.name}
                content={`${formatLength(p.width, units, { decimals: 2 })} × ${formatLength(p.height, units, { decimals: 2 })}${ok ? '' : ' · does not fit here'}`}
              >
                <button
                  type="button"
                  disabled={!ok}
                  aria-pressed={active}
                  onClick={() => {
                    execute(
                      setOpeningProps(plan, opening.id, {
                        width: next.width,
                        height: next.height,
                        sillHeight: next.sillHeight,
                        ...(p.style ? { style: p.style } : {}),
                      }),
                    );
                  }}
                  className={cn(
                    'h-7 rounded-lg bg-fg/[0.04] text-[11px] font-medium text-fg-muted shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:text-fg disabled:opacity-35',
                    active && 'bg-accent-soft text-accent shadow-[inset_0_0_0_1.5px_var(--accent)]',
                  )}
                >
                  {p.name}
                </button>
              </Tooltip>
            );
          })}
        </div>
        <Field label="Width">
          <LengthInput
            label="Opening width"
            value={opening.width}
            units={units}
            min={MIN_OPENING_SIZE}
            onChange={(width) => {
              if (!fits({ ...opening, width })) return false;
              execute(setOpeningProps(plan, opening.id, { width }));
              return true;
            }}
          />
        </Field>
        <Field label="Height">
          <LengthInput
            label="Opening height"
            value={opening.height}
            units={units}
            min={MIN_OPENING_SIZE}
            onChange={(height) => {
              if (!fits({ ...opening, height })) return false;
              execute(setOpeningProps(plan, opening.id, { height }));
              return true;
            }}
          />
        </Field>
        {!isDoor && (
          <Field label="Sill height">
            <LengthInput
              label="Sill height"
              value={opening.sillHeight}
              units={units}
              min={0}
              onChange={(sillHeight) => {
                if (!fits({ ...opening, sillHeight })) return false;
                execute(setOpeningProps(plan, opening.id, { sillHeight }));
                return true;
              }}
            />
          </Field>
        )}
        <Field label="From wall start">
          <LengthInput
            label="Distance from wall start"
            value={opening.offset - opening.width / 2}
            units={units}
            min={0}
            onChange={(edge) => {
              const offset = edge + opening.width / 2;
              if (!fits({ ...opening, offset })) return false;
              execute(setOpeningProps(plan, opening.id, { offset }));
              return true;
            }}
          />
        </Field>
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          Fits up to{' '}
          <span className="tabular font-mono text-fg-muted">
            {formatLength(maxOpeningWidth(opening, wall, plan.openings, wall.id), units, {
              decimals: 2,
            })}{' '}
            × {formatLength(wall.height - opening.sillHeight, units, { decimals: 2 })}
          </span>{' '}
          here · drag the end grips on the plan to resize
        </p>
      </PanelSection>
      <PanelSection title="Colour" className="border-b-0 pt-0">
        <ColorSwatches
          label={isDoor ? 'Door colour' : 'Frame colour'}
          value={opening.color}
          original={isDoor ? '#b48a63' : '#f7f6f2'}
          onChange={(hex) => {
            execute(setOpeningProps(plan, opening.id, { color: hex }));
          }}
        />
      </PanelSection>
      {isDoor && openingStyleOf(opening) !== 'barn' && openingStyleOf(opening) !== 'pet' && (
        <PanelSection title="Swing" className="border-b-0 pt-0">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                execute(
                  setOpeningProps(plan, opening.id, {
                    hinge: opening.hinge === 'end' ? 'start' : 'end',
                  }),
                );
              }}
            >
              <ArrowLeftRight className="size-3.5" /> Flip hinge
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                execute(
                  setOpeningProps(plan, opening.id, { swing: opening.swing === 'b' ? 'a' : 'b' }),
                );
              }}
            >
              <FlipVertical2 className="size-3.5" /> Flip side
            </Button>
          </div>
        </PanelSection>
      )}
      <div className="px-4 pb-4">
        <DeleteButton
          label={`Delete ${opening.type}`}
          onClick={() => {
            execute(deleteOpening(plan, opening.id));
            select(null);
          }}
        />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

/** Paint or textured finish (with optional recolour) for a room's ceiling. */
function CeilingFinish({ room }: { room: ResolvedRoom }) {
  const execute = usePlanStore((s) => s.execute);
  const setShowCeilings = useUiStore((s) => s.setShowCeilings);
  const current = getMaterial(room.meta?.ceilingMaterial);
  const textured = current?.category === 'ceiling';
  const [mode, setMode] = useState<'paint' | 'texture'>(textured ? 'texture' : 'paint');
  const keep = {
    key: room.key,
    name: room.name,
    ...(room.meta?.floorMaterial ? { floorMaterial: room.meta.floorMaterial } : {}),
    ...(room.meta?.floorTint ? { floorTint: room.meta.floorTint } : {}),
  };
  const apply = (ceilingMaterial: string | null, ceilingTint?: string | null) => {
    execute(
      setRoomMeta(room.meta, {
        ...keep,
        ...(ceilingMaterial ? { ceilingMaterial } : {}),
        ...(ceilingMaterial && ceilingTint ? { ceilingTint } : {}),
      }),
    );
    // Make the new ceiling visible in 3D straight away.
    if (ceilingMaterial) setShowCeilings(true);
  };
  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel="Ceiling finish type"
        value={mode}
        className="w-full [&>*]:flex-1"
        options={FINISH_MODES}
        onChange={setMode}
      />
      {mode === 'paint' ? (
        <PaintPicker
          label="Ceiling paint"
          value={textured ? undefined : room.meta?.ceilingMaterial}
          onChange={(id) => {
            apply(id);
          }}
        />
      ) : (
        <>
          <CeilingTexturePicker
            value={textured ? room.meta?.ceilingMaterial : undefined}
            onChange={(id) => {
              apply(id);
            }}
          />
          {textured && (
            <div className="space-y-1.5">
              <p className="text-xs text-fg-muted">Colour</p>
              <ColorSwatches
                label="Ceiling colour"
                value={room.meta?.ceilingTint}
                original={current.colorHex}
                onChange={(hex) => {
                  apply(room.meta?.ceilingMaterial ?? null, hex);
                }}
              />
            </div>
          )}
        </>
      )}
      <p className="text-[11px] leading-relaxed text-fg-subtle">
        See it in 3D with the ceiling toggle, or walk through the room.
      </p>
    </div>
  );
}

export function RoomInspector({ room, units }: { room: ResolvedRoom; units: UnitSystem }) {
  const execute = usePlanStore((s) => s.execute);
  const planned = usePlanStore((s) => s.activeKind === 'planned');
  const floor = getMaterial(room.meta?.floorMaterial);
  const meta = {
    key: room.key,
    name: room.name,
    ...(room.meta?.ceilingMaterial ? { ceilingMaterial: room.meta.ceilingMaterial } : {}),
    ...(room.meta?.ceilingTint ? { ceilingTint: room.meta.ceilingTint } : {}),
  };
  return (
    <>
      <Header
        icon={<SquareDashed className="size-4" />}
        title={room.name}
        subtitle={`${room.wallIds.length} walls`}
      />
      <PanelSection title="Room" className="border-b-0">
        <Field label="Name">
          <CommitInput
            label="Room name"
            className="w-40"
            display={room.name}
            onCommit={(text) => {
              const name = text.trim();
              if (!name) return false;
              const floorId = room.meta?.floorMaterial;
              const tint = room.meta?.floorTint;
              execute(
                setRoomMeta(room.meta, {
                  ...meta,
                  name,
                  ...(floorId ? { floorMaterial: floorId } : {}),
                  ...(tint ? { floorTint: tint } : {}),
                }),
              );
              return true;
            }}
          />
        </Field>
        <PropRow label="Floor area" value={formatArea(room.area, units)} />
        <PropRow label="Perimeter" value={formatLength(room.perimeter, units)} />
      </PanelSection>
      <PanelSection title={planned ? 'New floor' : 'Existing floor'} className="border-b-0 pt-0">
        <FloorPicker
          value={room.meta?.floorMaterial}
          onChange={(id) => {
            // A new floor starts in its own colour.
            execute(setRoomMeta(room.meta, { ...meta, ...(id ? { floorMaterial: id } : {}) }));
          }}
        />
        {floor?.textureSet && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-fg-muted">Colour</p>
            <ColorSwatches
              label="Floor colour"
              value={room.meta?.floorTint}
              original={floor.colorHex}
              onChange={(hex) => {
                execute(
                  setRoomMeta(room.meta, {
                    ...meta,
                    ...(room.meta?.floorMaterial ? { floorMaterial: room.meta.floorMaterial } : {}),
                    ...(hex ? { floorTint: hex } : {}),
                  }),
                );
              }}
            />
          </div>
        )}
        {!planned && (
          <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">
            Record what’s there today. Only changes you make after “Start planning” are priced.
          </p>
        )}
      </PanelSection>
      <PanelSection
        title={planned ? 'New ceiling' : 'Existing ceiling'}
        className="border-b-0 pt-0"
      >
        <CeilingFinish key={room.key} room={room} />
      </PanelSection>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function PlanOverview({
  plan,
  rooms,
  units,
}: {
  plan: Plan;
  rooms: readonly ResolvedRoom[];
  units: UnitSystem;
}) {
  const doors = plan.openings.filter((o) => o.type === 'door').length;
  const totalArea = rooms.reduce((s, r) => s + r.area, 0);
  return (
    <PanelSection title="Plan">
      <PropRow label="Walls" value={plan.walls.length} />
      <PropRow label="Doors · windows" value={`${doors} · ${plan.openings.length - doors}`} />
      <PropRow label="Rooms" value={rooms.length} />
      <PropRow label="Furniture" value={plan.furniture.length} />
      <PropRow label="Floor area" value={formatArea(totalArea, units)} />
    </PanelSection>
  );
}
