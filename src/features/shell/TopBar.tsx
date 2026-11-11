import { Box, Columns2, Moon, PanelRight, Square, Sun } from 'lucide-react';
import { Link } from 'react-router';
import { LogoMark } from '@/components/brand/Logo';
import { IconButton, SegmentedControl, Tooltip, type SegmentOption } from '@/components/ui';
import { cn } from '@/lib/cn';
import { usePlanStore } from '@/state/planStore';
import { useUiStore, type ViewMode } from '@/state/uiStore';
import { PlanVersionSwitch } from './PlanVersionSwitch';
import { UndoRedo } from './UndoRedo';
import type { UnitSystem } from '@/core/units';

const VIEW_OPTIONS: readonly SegmentOption<ViewMode>[] = [
  {
    value: '2d',
    label: (
      <>
        <Square className="size-3.5" />
        <span className="hidden sm:inline">2D</span>
      </>
    ),
    ariaLabel: '2D view',
    tooltip: 'Plan view',
    shortcut: '1',
  },
  {
    value: 'split',
    label: (
      <>
        <Columns2 className="size-3.5" />
        <span className="hidden sm:inline">Split</span>
      </>
    ),
    ariaLabel: 'Split view',
    tooltip: 'Side by side',
    shortcut: '2',
  },
  {
    value: '3d',
    label: (
      <>
        <Box className="size-3.5" />
        <span className="hidden sm:inline">3D</span>
      </>
    ),
    ariaLabel: '3D view',
    tooltip: '3D view',
    shortcut: '3',
  },
];

const UNIT_OPTIONS: readonly SegmentOption<UnitSystem>[] = [
  { value: 'metric', label: 'm', ariaLabel: 'Metric units' },
  { value: 'imperial', label: 'ft', ariaLabel: 'Imperial units' },
];

export function TopBar() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const units = useUiStore((s) => s.units);
  const setUnits = useUiStore((s) => s.setUnits);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const projectName = usePlanStore((s) => s.project.name);
  const setProjectName = usePlanStore((s) => s.setProjectName);
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);

  return (
    <header className="relative z-20 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border bg-surface/80 px-3 backdrop-blur-xl">
      {/* Left: brand + project */}
      <div className="flex min-w-0 items-center gap-2">
        <Tooltip content="Back to home">
          <Link
            to="/"
            aria-label="Renotion home"
            className="rounded-lg p-0.5 transition-transform hover:scale-105"
          >
            <LogoMark />
          </Link>
        </Tooltip>
        <span className="hidden text-fg-subtle/60 select-none sm:inline">/</span>
        <input
          value={projectName}
          onChange={(e) => {
            setProjectName(e.target.value);
          }}
          onBlur={(e) => {
            if (e.target.value.trim() === '') setProjectName('Untitled project');
          }}
          aria-label="Project name"
          spellCheck={false}
          className="hidden h-8 max-w-56 min-w-0 rounded-lg bg-transparent px-2 text-sm font-medium text-fg transition-colors outline-none hover:bg-fg/[0.04] focus:bg-fg/[0.06] sm:block"
        />
        <div className="ml-1 hidden h-5 w-px bg-border md:block" />
        <div className="hidden md:block">
          <UndoRedo />
        </div>
      </div>

      {/* Center: plan version */}
      <div className="hidden lg:block">
        <PlanVersionSwitch />
      </div>

      {/* Right: view + preferences */}
      <div className="col-start-3 flex items-center justify-end gap-1.5">
        <SegmentedControl
          ariaLabel="View mode"
          value={viewMode}
          onChange={setViewMode}
          options={VIEW_OPTIONS}
        />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <SegmentedControl
          ariaLabel="Units"
          size="sm"
          value={units}
          onChange={setUnits}
          options={UNIT_OPTIONS}
          className="hidden sm:inline-flex"
        />
        <Tooltip content={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          <IconButton label="Toggle theme" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
        </Tooltip>
        <Tooltip content={rightPanelOpen ? 'Hide properties' : 'Show properties'}>
          <IconButton
            label="Toggle properties panel"
            aria-pressed={rightPanelOpen}
            onClick={toggleRightPanel}
            className={cn(rightPanelOpen && 'text-fg')}
          >
            <PanelRight className="size-4" />
          </IconButton>
        </Tooltip>
      </div>
    </header>
  );
}
