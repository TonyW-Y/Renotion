import { useId, useState, type ReactNode } from 'react';
import { formatLength, parseLength, type UnitSystem } from '@/core/units';
import { cn } from '@/lib/cn';

export function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[13px] text-fg-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'h-8 rounded-lg bg-fg/[0.04] px-2.5 text-[13px] text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none transition-shadow placeholder:text-fg-subtle hover:shadow-[inset_0_0_0_1px_var(--border-strong)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)]';

interface CommitInputProps {
  /** Formatted value shown when not editing. */
  display: string;
  /** Returns false to reject the edit (the field flashes red). */
  onCommit: (text: string) => boolean;
  label: string;
  mono?: boolean;
  className?: string;
}

/** A text field that commits on Enter / blur and reverts on Escape. */
export function CommitInput({
  display,
  onCommit,
  label,
  mono = false,
  className,
}: CommitInputProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const commit = (): boolean => {
    if (draft === null) return true;
    const ok = draft.trim() === display || onCommit(draft);
    setInvalid(!ok);
    if (ok) setDraft(null);
    return ok;
  };

  return (
    <input
      id={id}
      aria-label={label}
      aria-invalid={invalid}
      value={draft ?? display}
      onFocus={(e) => {
        setDraft(display);
        e.target.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        setInvalid(false);
      }}
      onBlur={() => {
        commit();
        setDraft(null);
        setInvalid(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && commit()) e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(null);
          setInvalid(false);
          e.currentTarget.blur();
        }
      }}
      spellCheck={false}
      className={cn(
        inputClass,
        mono && 'tabular font-mono text-xs',
        invalid &&
          'shadow-[inset_0_0_0_1.5px_var(--danger)] focus:shadow-[inset_0_0_0_1.5px_var(--danger)]',
        className,
      )}
    />
  );
}

interface LengthInputProps {
  value: number;
  units: UnitSystem;
  label: string;
  /** Return false to reject (e.g. the opening would not fit). */
  onChange: (metres: number) => boolean | undefined;
  min?: number;
  max?: number;
}

/** Unit-aware length field: shows 2.44 m or 8′ 0″, accepts "244cm", "8' 6\"", etc. */
export function LengthInput({
  value,
  units,
  label,
  onChange,
  min = 0.01,
  max = 100,
}: LengthInputProps) {
  return (
    <CommitInput
      label={label}
      mono
      className="w-28 text-right"
      display={formatLength(value, units, { fraction: 16 })}
      onCommit={(text) => {
        const m = parseLength(text, units);
        if (m === null || m < min || m > max) return false;
        return onChange(Math.round(m * 1e4) / 1e4) !== false;
      }}
    />
  );
}
