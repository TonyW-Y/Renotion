import { Tooltip } from '@/components/ui';
import { openingStyleOf, stylesFor } from '@/core/openings';
import type { Opening, OpeningStyle } from '@/core/types';
import { cn } from '@/lib/cn';

/** Tiny front-elevation drawing of each design, in currentColor. */
function DesignIcon({ style }: { style: OpeningStyle }) {
  const glass = { fill: 'var(--accent-2)', fillOpacity: 0.25 };
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinejoin: 'round' as const,
  };
  switch (style) {
    case 'slab':
      return (
        <g {...common}>
          <rect x={10} y={6} width={20} height={36} rx={1} />
          <circle cx={26} cy={25} r={1.2} fill="currentColor" />
        </g>
      );
    case 'panel':
      return (
        <g {...common}>
          <rect x={10} y={6} width={20} height={36} rx={1} />
          <rect x={13} y={9} width={6} height={12} />
          <rect x={21} y={9} width={6} height={12} />
          <rect x={13} y={25} width={6} height={13} />
          <rect x={21} y={25} width={6} height={13} />
        </g>
      );
    case 'glass':
      return (
        <g {...common}>
          <rect x={10} y={6} width={20} height={36} rx={1} />
          <rect x={13} y={9} width={14} height={26} {...glass} />
        </g>
      );
    case 'barn':
      return (
        <g {...common}>
          <line x1={4} y1={5} x2={38} y2={5} />
          <rect x={8} y={7} width={22} height={35} rx={1} />
          <path d="M8 7 L30 42 M30 7 L8 42" strokeWidth={1} />
        </g>
      );
    case 'double':
      return (
        <g {...common}>
          <rect x={5} y={6} width={15} height={36} rx={1} />
          <rect x={20} y={6} width={15} height={36} rx={1} />
          <rect x={8} y={9} width={9} height={26} {...glass} />
          <rect x={23} y={9} width={9} height={26} {...glass} />
        </g>
      );
    case 'pet':
      return (
        <g {...common}>
          <rect x={10} y={6} width={20} height={36} rx={1} strokeDasharray="2 2" opacity={0.5} />
          <rect
            x={15}
            y={31}
            width={10}
            height={11}
            rx={1.5}
            fill="currentColor"
            fillOpacity={0.2}
          />
        </g>
      );
    case 'casement':
      return (
        <g {...common}>
          <rect x={6} y={10} width={28} height={28} rx={1} {...glass} />
          <line x1={20} y1={10} x2={20} y2={38} />
        </g>
      );
    case 'double-hung':
      return (
        <g {...common}>
          <rect x={6} y={10} width={28} height={28} rx={1} {...glass} />
          <line x1={6} y1={24} x2={34} y2={24} strokeWidth={2} />
        </g>
      );
    case 'slider':
      return (
        <g {...common}>
          <rect x={6} y={10} width={28} height={28} rx={1} {...glass} />
          <line x1={18} y1={10} x2={18} y2={38} />
          <line x1={22} y1={10} x2={22} y2={38} />
        </g>
      );
    case 'picture':
      return (
        <g {...common}>
          <rect x={6} y={10} width={28} height={28} rx={1} strokeWidth={2.6} {...glass} />
        </g>
      );
    case 'grid':
      return (
        <g {...common}>
          <rect x={6} y={10} width={28} height={28} rx={1} {...glass} />
          <path d="M15.3 10 V38 M24.7 10 V38 M6 19.3 H34 M6 28.7 H34" strokeWidth={1} />
        </g>
      );
    case 'bay':
      return (
        <g {...common}>
          <rect x={8} y={9} width={24} height={26} rx={1} {...glass} />
          <line x1={20} y1={9} x2={20} y2={35} />
          <rect x={4} y={35} width={32} height={4} rx={1} fill="currentColor" fillOpacity={0.25} />
        </g>
      );
  }
}

/** Grid of door / window designs with little elevation icons. */
export function OpeningDesignPicker({
  opening,
  onChange,
}: {
  opening: Opening;
  onChange: (style: OpeningStyle) => void;
}) {
  const current = openingStyleOf(opening);
  return (
    <div
      role="radiogroup"
      aria-label={opening.type === 'door' ? 'Door design' : 'Window design'}
      className="grid grid-cols-3 gap-2"
    >
      {stylesFor(opening.type).map((s) => {
        const active = s.id === current;
        return (
          <Tooltip key={s.id} content={s.name}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={s.name}
              onClick={() => {
                onChange(s.id);
              }}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl bg-fg/[0.03] px-1 pt-1.5 pb-1.5 text-fg-muted shadow-[inset_0_0_0_1px_var(--border)] transition-all hover:bg-fg/[0.06] hover:text-fg',
                active && 'bg-accent-soft text-accent shadow-[inset_0_0_0_1.5px_var(--accent)]',
              )}
            >
              <svg viewBox="0 0 40 46" className="h-9 w-8" aria-hidden="true">
                <DesignIcon style={s.id} />
              </svg>
              <span className="w-full truncate text-[10.5px] leading-tight font-medium">
                {s.name}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
