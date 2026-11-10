import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-gradient text-accent-fg shadow-glow hover:brightness-110 [text-shadow:0_1px_0_rgb(0_0_0/0.15)]',
  secondary: 'bg-surface-2 text-fg shadow-panel hover:bg-elevated',
  ghost: 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-9 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-[15px]',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(
    'inline-flex items-center justify-center rounded-xl font-medium whitespace-nowrap transition-[filter,background-color,color,transform] duration-150 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}
