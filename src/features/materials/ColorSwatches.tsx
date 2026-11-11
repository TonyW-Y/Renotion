import { Check, Pipette, RotateCcw } from 'lucide-react';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { SWATCHES } from './swatches';

interface ColorSwatchesProps {
  /** Current colour (#hex), or undefined for the original. */
  value: string | undefined;
  onChange: (hex: string | null) => void;
  label: string;
  /** Colour shown for "original" (e.g. the model's own colour). */
  original?: string | undefined;
  /** Show only the first n swatches (compact rows). */
  limit?: number;
}

/**
 * A row of colour dots, a custom picker and a reset-to-original button.
 * Used for floors, walls, doors / windows and furniture.
 */
export function ColorSwatches({
  value,
  onChange,
  label,
  original,
  limit = 23,
}: ColorSwatchesProps) {
  const lower = value?.toLowerCase();
  const known = SWATCHES.some((s) => s.hex.toLowerCase() === lower);
  const custom = value && !known;
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label={label} className="grid grid-cols-8 gap-1.5">
        <Tooltip content="Original">
          <button
            type="button"
            role="radio"
            aria-checked={!value}
            aria-label={`${label}: original`}
            onClick={() => {
              onChange(null);
            }}
            className={cn(
              'relative flex aspect-square items-center justify-center overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)] transition-transform hover:scale-110',
              !value && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
            )}
            style={{ backgroundColor: original ?? 'transparent' }}
          >
            <RotateCcw className="size-3 text-white mix-blend-difference" strokeWidth={2.5} />
          </button>
        </Tooltip>
        {SWATCHES.slice(0, limit).map((s) => {
          const active = s.hex.toLowerCase() === lower;
          return (
            <Tooltip key={s.hex} content={s.name}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${label}: ${s.name}`}
                onClick={() => {
                  onChange(s.hex);
                }}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition-transform hover:scale-110',
                  active && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                )}
                style={{ backgroundColor: s.hex }}
              >
                {active && (
                  <Check className="size-3 text-white mix-blend-difference" strokeWidth={3} />
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>
      <label
        className={cn(
          'relative flex h-7 cursor-pointer items-center gap-2 rounded-lg bg-fg/[0.04] px-2 text-xs text-fg-muted shadow-[inset_0_0_0_1px_var(--border)] hover:text-fg',
          custom && 'text-fg shadow-[inset_0_0_0_1.5px_var(--accent)]',
        )}
      >
        <Pipette className="size-3.5" />
        {custom ? (
          <>
            <span className="size-3.5 rounded-full" style={{ backgroundColor: value }} />
            <span className="font-mono">{value.toUpperCase()}</span>
          </>
        ) : (
          'Custom colour'
        )}
        <input
          type="color"
          aria-label={`${label}: custom colour`}
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value ?? original ?? '#ffffff'}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      </label>
    </div>
  );
}
