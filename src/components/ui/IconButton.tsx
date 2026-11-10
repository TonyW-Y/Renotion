import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

interface IconButtonProps extends ComponentProps<'button'> {
  /** Accessible name — required because the button has no visible text. */
  label: string;
  size?: 'sm' | 'md';
}

export function IconButton({ label, size = 'md', className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg text-fg-muted transition-[color,background-color,transform] duration-150 select-none hover:bg-fg/[0.06] hover:text-fg active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40',
        size === 'md' ? 'size-9' : 'size-7',
        className,
      )}
      {...props}
    />
  );
}
