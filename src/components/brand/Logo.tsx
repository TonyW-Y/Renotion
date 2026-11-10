import { useId } from 'react';
import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('size-7', className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="var(--surface-2)" />
      <rect x=".5" y=".5" width="31" height="31" rx="7.5" stroke="var(--border-strong)" />
      <path
        d="M16 6.5 25.5 12v11L16 28.5 6.5 23V12z"
        stroke={`url(#${id})`}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 12 16 17.5 25.5 12M16 17.5v11"
        stroke={`url(#${id})`}
        strokeWidth="2"
        strokeLinejoin="round"
        opacity=".5"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">Renotion</span>
    </span>
  );
}
