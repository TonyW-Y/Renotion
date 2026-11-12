import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Accessible modal (focus trap, Esc to close, labelled) in the app's style. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <RadixDialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-elevated p-6 shadow-float outline-none',
            className,
          )}
        >
          <RadixDialog.Close
            aria-label="Close"
            className="absolute top-4 right-4 rounded-lg p-1 text-fg-subtle transition-colors hover:bg-fg/[0.06] hover:text-fg"
          >
            <X className="size-4" />
          </RadixDialog.Close>
          <RadixDialog.Title className="pr-6 text-lg font-semibold tracking-[-0.01em] text-fg">
            {title}
          </RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-1 text-sm leading-relaxed text-fg-muted">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
          <div className="mt-5">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** A text field with a visible label, for forms in dialogs and pages. */
export function TextField({
  label,
  className,
  ...props
}: React.ComponentProps<'input'> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-fg-muted">{label}</span>
      <input
        {...props}
        className={cn(
          'h-10 w-full rounded-xl bg-fg/[0.04] px-3 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border)] transition-shadow outline-none placeholder:text-fg-subtle hover:shadow-[inset_0_0_0_1px_var(--border-strong)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)]',
          className,
        )}
      />
    </label>
  );
}
