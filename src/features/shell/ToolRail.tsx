import { motion } from 'motion/react';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/state/uiStore';
import { TOOLS } from './tools';

export function ToolRail() {
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);

  return (
    <nav
      aria-label="Tools"
      className="pointer-events-auto flex flex-row gap-1 rounded-2xl bg-surface/85 p-1.5 shadow-float backdrop-blur-xl sm:flex-col"
    >
      {TOOLS.map((t, i) => {
        const active = t.id === tool;
        const Icon = t.icon;
        return (
          <div key={t.id} className="contents">
            {i === TOOLS.length - 1 && (
              <div className="mx-0.5 my-2 w-px bg-border sm:mx-2 sm:my-0.5 sm:h-px sm:w-auto" />
            )}
            <Tooltip content={t.label} shortcut={t.shortcut} side="right">
              <button
                type="button"
                aria-label={t.label}
                aria-pressed={active}
                onClick={() => {
                  setTool(t.id);
                }}
                className={cn(
                  'relative flex size-10 items-center justify-center rounded-xl transition-colors duration-150 active:scale-95',
                  active ? 'text-accent-fg' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
                  t.id === 'delete' && !active && 'hover:text-danger',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tool-active"
                    className="bg-accent-gradient absolute inset-0 rounded-xl shadow-glow"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                  />
                )}
                <Icon className="relative size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              </button>
            </Tooltip>
          </div>
        );
      })}
    </nav>
  );
}
