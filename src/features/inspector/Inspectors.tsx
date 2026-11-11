import {
  ArrowLeftRight,
  DoorOpen,
  FlipVertical2,
  Grid2x2,
  Square,
  SquareDashed,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  setOpeningProps,
  setRoomMeta,
  setWallLength,
  setWallProps,
  deleteOpening,
  deleteWall,
} from '@/core/commands';
import { canPlaceOpening, wallLength } from '@/core/geometry/walls';
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
  type SegmentOption,
} from '@/components/ui';
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
}: {
  wall: Wall;
  plan: Plan;
  units: UnitSystem;
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
                ? { type, sillHeight: 0, height: Math.min(2.03, wall.height) }
                : { type, sillHeight: 0.9, height: Math.min(1.2, wall.height - 0.9) };
            execute(setOpeningProps(plan, opening.id, next));
          }}
        />
      </PanelSection>
      <PanelSection title="Dimensions" className="border-b-0">
        <Field label="Width">
          <LengthInput
            label="Opening width"
            value={opening.width}
            units={units}
            min={0.3}
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
            min={0.3}
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
      </PanelSection>
      {isDoor && (
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

export function RoomInspector({ room, units }: { room: ResolvedRoom; units: UnitSystem }) {
  const execute = usePlanStore((s) => s.execute);
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
              execute(setRoomMeta(room.meta, { ...(room.meta ?? {}), key: room.key, name }));
              return true;
            }}
          />
        </Field>
        <PropRow label="Floor area" value={formatArea(room.area, units)} />
        <PropRow label="Perimeter" value={formatLength(room.perimeter, units)} />
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
      <PropRow label="Floor area" value={formatArea(totalArea, units)} />
    </PanelSection>
  );
}
