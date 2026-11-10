import { formatLength } from '@/core/units';
import { useUiStore } from '@/state/uiStore';
import { TOOLS } from './tools';

export function StatusBar() {
  const tool = useUiStore((s) => s.tool);
  const cursor = useUiStore((s) => s.cursor);
  const zoom = useUiStore((s) => s.zoom);
  const units = useUiStore((s) => s.units);
  const def = TOOLS.find((t) => t.id === tool) ?? TOOLS[0];

  const fmt = (v: number) => formatLength(v, units, { decimals: 2, fraction: 4 });

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between gap-4 border-t border-border bg-surface px-3 text-[11px] text-fg-muted">
      <div className="flex min-w-0 items-center gap-2">
        {def && (
          <>
            <def.icon className="size-3.5 shrink-0 text-accent" />
            <span className="font-medium text-fg" data-testid="active-tool">
              {def.label}
            </span>
            <span className="hidden truncate text-fg-subtle md:inline">{def.hint}</span>
          </>
        )}
      </div>
      <div className="tabular flex shrink-0 items-center gap-3 font-mono">
        <span className="hidden w-44 text-right sm:inline" aria-label="Cursor position">
          {cursor ? (
            <>
              <span className="text-fg-subtle">X</span> {fmt(cursor.x)}{' '}
              <span className="ml-1.5 text-fg-subtle">Y</span> {fmt(cursor.y)}
            </>
          ) : (
            <span className="text-fg-subtle">—</span>
          )}
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" />
        <span>{Math.round(zoom * 100)}%</span>
        <span className="h-3 w-px bg-border" />
        <span className="flex items-center gap-1.5 font-sans">
          <span className="size-1.5 animate-pulse-soft rounded-full bg-success" />
          Local
        </span>
      </div>
    </footer>
  );
}
