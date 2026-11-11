import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '@/components/ui';
import { FURNITURE, FURNITURE_CATEGORIES, type FurnitureCategory } from '@/core/furniture/catalog';
import { formatLength } from '@/core/units';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/state/uiStore';
import { TopView } from './TopView';

export const FURNITURE_MIME = 'application/x-renotion-furniture';

/** Floating catalogue shown while the furniture tool is active. */
export function FurnitureCatalog() {
  const tool = useUiStore((s) => s.tool);
  const placing = useUiStore((s) => s.placing);
  const setPlacing = useUiStore((s) => s.setPlacing);
  const setTool = useUiStore((s) => s.setTool);
  const units = useUiStore((s) => s.units);
  const [category, setCategory] = useState<FurnitureCategory>('Living');
  const items = FURNITURE.filter((m) => m.category === category);

  return (
    <AnimatePresence>
      {tool === 'furniture' && (
        <motion.aside
          aria-label="Furniture catalogue"
          initial={{ opacity: 0, x: -12, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -12, scale: 0.98 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          className="pointer-events-auto absolute top-3 bottom-3 left-[76px] z-20 flex w-64 flex-col overflow-hidden rounded-2xl bg-surface/95 shadow-float backdrop-blur-xl max-sm:top-auto max-sm:right-3 max-sm:bottom-32 max-sm:left-3 max-sm:h-80 max-sm:w-auto"
        >
          <header className="flex h-11 shrink-0 items-center justify-between pr-1.5 pl-4">
            <h2 className="text-[13px] font-semibold text-fg">Furniture</h2>
            <IconButton
              size="sm"
              label="Close furniture catalogue"
              onClick={() => {
                setTool('select');
              }}
            >
              <X className="size-3.5" />
            </IconButton>
          </header>
          <div
            className="flex shrink-0 [scrollbar-width:none] gap-1 overflow-x-auto px-3 pb-2"
            role="tablist"
          >
            {FURNITURE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={c === category}
                onClick={() => {
                  setCategory(c);
                }}
                className={cn(
                  'h-7 shrink-0 rounded-full px-3 text-xs font-medium transition-colors',
                  c === category
                    ? 'bg-fg text-bg'
                    : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto px-3 pb-3">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                draggable
                aria-pressed={placing === m.id}
                aria-label={`Place ${m.name}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData(FURNITURE_MIME, m.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => {
                  setPlacing(placing === m.id ? null : m.id);
                }}
                className={cn(
                  'group flex cursor-grab flex-col items-center gap-1.5 rounded-xl bg-fg/[0.03] p-2 text-center shadow-[inset_0_0_0_1px_var(--border)] transition-all hover:bg-fg/[0.06] active:cursor-grabbing',
                  placing === m.id && 'bg-accent-soft shadow-[inset_0_0_0_1.5px_var(--accent)]',
                )}
              >
                <div className="flex h-16 w-full items-center justify-center">
                  <TopView
                    model={m}
                    className="max-h-16 max-w-full transition-transform group-hover:scale-105"
                  />
                </div>
                <span className="text-xs font-medium text-fg">{m.name}</span>
                <span className="font-mono text-[10px] text-fg-subtle">
                  {formatLength(m.width, units, { decimals: 1, fraction: 2 })} ×{' '}
                  {formatLength(m.depth, units, { decimals: 1, fraction: 2 })}
                </span>
              </button>
            ))}
          </div>
          <p className="shrink-0 border-t border-border px-4 py-2.5 text-[11px] leading-relaxed text-fg-subtle">
            Click an item, then click the plan to place it — or drag it in.{' '}
            <span className="font-medium text-fg-muted">R</span> rotates.
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
