import { Sparkles } from 'lucide-react';
import { Button, SegmentedControl, Tooltip, type SegmentOption } from '@/components/ui';
import type { PlanKind } from '@/core/project';
import { usePlanStore } from '@/state/planStore';
import { useUiStore } from '@/state/uiStore';

const OPTIONS: readonly SegmentOption<PlanKind>[] = [
  { value: 'baseline', label: 'Current', tooltip: 'Your home as it is today' },
  { value: 'planned', label: 'Renovation', tooltip: 'Your planned changes' },
];

/** Switches between the baseline and planned versions, or starts planning. */
export function PlanVersionSwitch() {
  const hasPlanned = usePlanStore((s) => s.project.planned !== null);
  const hasWalls = usePlanStore((s) => s.project.baseline.walls.length > 0);
  const activeKind = usePlanStore((s) => s.activeKind);
  const setActiveKind = usePlanStore((s) => s.setActiveKind);
  const startPlanning = usePlanStore((s) => s.startPlanning);
  const select = useUiStore((s) => s.select);

  if (hasPlanned) {
    return (
      <SegmentedControl
        ariaLabel="Plan version"
        value={activeKind}
        onChange={(kind) => {
          select(null);
          setActiveKind(kind);
        }}
        options={OPTIONS}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-lg bg-fg/[0.04] px-3 py-1.5 text-xs font-medium text-fg shadow-[inset_0_0_0_1px_var(--border)]">
        Current
      </span>
      <Tooltip
        content={
          hasWalls ? 'Copy your home and start planning changes' : 'Draw your current home first'
        }
      >
        <span className="inline-flex">
          <Button
            size="sm"
            variant="secondary"
            disabled={!hasWalls}
            onClick={() => {
              select(null);
              startPlanning();
            }}
          >
            <Sparkles className="size-3.5 text-accent" />
            Start planning
          </Button>
        </span>
      </Tooltip>
    </div>
  );
}
