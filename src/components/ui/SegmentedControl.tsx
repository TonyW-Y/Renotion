import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tooltip } from './Tooltip';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible label when `label` is an icon. */
  ariaLabel?: string;
  tooltip?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const pillId = useId();

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => {
        // Radix emits '' when the active item is clicked again; keep a value selected.
        const next = options.find((o) => o.value === v);
        if (next) onChange(next.value);
      }}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex items-center rounded-[10px] bg-fg/[0.04] p-0.5 shadow-[inset_0_0_0_1px_var(--border)]',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const item = (
          <ToggleGroup.Item
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled ?? false}
            aria-label={opt.ariaLabel}
            className={cn(
              'relative z-0 inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-40',
              size === 'md' ? 'h-7 px-3 text-xs' : 'h-6 px-2 text-[11px]',
              active ? 'text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 -z-10 rounded-lg bg-elevated shadow-panel"
                transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
              />
            )}
            {opt.label}
          </ToggleGroup.Item>
        );
        return opt.tooltip !== undefined ? (
          <Tooltip
            key={opt.value}
            content={opt.tooltip}
            {...(opt.shortcut ? { shortcut: opt.shortcut } : {})}
          >
            {/* span wrapper keeps the tooltip working on disabled items */}
            <span className="inline-flex">{item}</span>
          </Tooltip>
        ) : (
          item
        );
      })}
    </ToggleGroup.Root>
  );
}
