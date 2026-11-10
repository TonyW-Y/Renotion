import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PanelSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PanelSection({ title, action, children, className }: PanelSectionProps) {
  return (
    <section className={cn('border-b border-border px-4 py-4 last:border-b-0', className)}>
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] text-fg-subtle uppercase">
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PropRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between text-[13px]">
      <span className="text-fg-muted">{label}</span>
      <span className="tabular font-mono text-xs text-fg">{value}</span>
    </div>
  );
}
