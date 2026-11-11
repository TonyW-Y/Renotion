import { AnimatePresence, motion } from 'motion/react';
import { MousePointerClick, X } from 'lucide-react';
import { IconButton, PanelSection, PropRow } from '@/components/ui';
import { DEFAULT_WALL_HEIGHT, DEFAULT_WALL_THICKNESS } from '@/core/types';
import { formatLength } from '@/core/units';
import {
  OpeningInspector,
  PlanOverview,
  RoomInspector,
  WallInspector,
} from '@/features/inspector/Inspectors';
import { EstimateSummary } from '@/features/estimate/EstimateSummary';
import { FurnitureInspector } from '@/features/inspector/FurnitureInspector';
import { selectActivePlan, usePlanStore } from '@/state/planStore';
import { useDerivedPlan } from '@/state/useDerivedPlan';
import { useUiStore } from '@/state/uiStore';

const GRID_SNAP = 0.1;

export function PropertiesPanel() {
  const open = useUiStore((s) => s.rightPanelOpen);
  const setOpen = useUiStore((s) => s.setRightPanelOpen);
  const units = useUiStore((s) => s.units);
  const selection = useUiStore((s) => s.selection);
  const plan = usePlanStore(selectActivePlan);
  const { rooms } = useDerivedPlan(plan);

  const wall =
    selection?.kind === 'wall' ? plan.walls.find((w) => w.id === selection.id) : undefined;
  const opening =
    selection?.kind === 'opening' ? plan.openings.find((o) => o.id === selection.id) : undefined;
  const openingWall = opening && plan.walls.find((w) => w.id === opening.wallId);
  const room = selection?.kind === 'room' ? rooms.find((r) => r.key === selection.id) : undefined;
  const item =
    selection?.kind === 'furniture' ? plan.furniture.find((f) => f.id === selection.id) : undefined;
  const inspector = wall ? (
    <WallInspector
      key={wall.id}
      wall={wall}
      plan={plan}
      units={units}
      rooms={rooms}
      side={selection?.side}
    />
  ) : opening && openingWall ? (
    <OpeningInspector
      key={opening.id}
      opening={opening}
      wall={openingWall}
      plan={plan}
      units={units}
    />
  ) : room ? (
    <RoomInspector key={room.key} room={room} units={units} />
  ) : item ? (
    <FurnitureInspector key={item.id} item={item} plan={plan} units={units} />
  ) : null;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="props"
          aria-label="Properties"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
          className="absolute inset-y-0 right-0 z-20 flex w-72 shrink-0 flex-col border-l border-border bg-surface/95 shadow-float backdrop-blur-xl lg:relative lg:bg-surface lg:shadow-none"
        >
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border pr-2 pl-4">
            <h2 className="text-[13px] font-semibold text-fg">Properties</h2>
            <IconButton
              size="sm"
              label="Close properties"
              onClick={() => {
                setOpen(false);
              }}
              className="lg:hidden"
            >
              <X className="size-3.5" />
            </IconButton>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {inspector ?? (
              <PanelSection title="Selection">
                <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong px-4 py-6 text-center">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-fg/[0.05]">
                    <MousePointerClick className="size-4 text-fg-subtle" />
                  </div>
                  <p className="text-[13px] font-medium text-fg">Nothing selected</p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-subtle">
                    Click a wall, opening or room to edit its dimensions and finishes.
                  </p>
                </div>
              </PanelSection>
            )}
            {inspector && <div className="border-b border-border" />}

            <EstimateSummary />
            <PlanOverview plan={plan} rooms={rooms} units={units} />

            <PanelSection title="Defaults">
              <PropRow label="Wall thickness" value={formatLength(DEFAULT_WALL_THICKNESS, units)} />
              <PropRow label="Wall height" value={formatLength(DEFAULT_WALL_HEIGHT, units)} />
              <PropRow label="Grid snap" value={formatLength(GRID_SNAP, units, { fraction: 16 })} />
            </PanelSection>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
