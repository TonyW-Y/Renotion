import { Ban, Check, Pipette } from 'lucide-react';
import { Tooltip } from '@/components/ui';
import {
  CEILING_FINISHES,
  customPaintId,
  FLOORING,
  getMaterial,
  PAINTS,
  WALL_FINISHES,
} from '@/core/estimate/defaultCosts';
import type { ID, Material } from '@/core/types';
import { cn } from '@/lib/cn';
import { textureUrl } from './textures';

const FLOOR_CHOICES = FLOORING.filter((m) => m.category !== 'ceiling');

interface PickerProps {
  value: ID | undefined;
  onChange: (id: ID | null) => void;
}

/** Grid of floor finishes with texture thumbnails. */
export function FloorPicker({ value, onChange }: PickerProps) {
  return (
    <TexturePicker
      label="Floor material"
      noneLabel="No floor material"
      options={FLOOR_CHOICES}
      value={value}
      onChange={onChange}
    />
  );
}

/** Grid of textured wall finishes (brick, stone, panelling, tile...). */
export function WallTexturePicker({ value, onChange, label }: PickerProps & { label: string }) {
  return (
    <TexturePicker
      label={label}
      noneLabel={`${label}: none`}
      options={WALL_FINISHES}
      value={value}
      onChange={onChange}
    />
  );
}

/** Grid of textured ceiling finishes (plaster, planks, panels, concrete...). */
export function CeilingTexturePicker({ value, onChange }: PickerProps) {
  return (
    <TexturePicker
      label="Ceiling texture"
      noneLabel="Ceiling texture: none"
      options={CEILING_FINISHES}
      value={value}
      onChange={onChange}
    />
  );
}

function TexturePicker({
  value,
  onChange,
  options,
  label,
  noneLabel,
}: PickerProps & { options: readonly Material[]; label: string; noneLabel: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2">
      <Tooltip content="No change">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          aria-label={noneLabel}
          onClick={() => {
            onChange(null);
          }}
          className={cn(
            'flex aspect-square items-center justify-center rounded-lg border border-dashed border-border-strong text-fg-subtle transition-all hover:text-fg',
            !value && 'border-solid border-accent text-accent ring-2 ring-accent/30',
          )}
        >
          <Ban className="size-4" />
        </button>
      </Tooltip>
      {options.map((m) => {
        const active = value === m.id;
        return (
          <Tooltip key={m.id} content={m.name}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={m.name}
              onClick={() => {
                onChange(m.id);
              }}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-lg bg-cover bg-center shadow-[inset_0_0_0_1px_var(--border)] transition-all hover:scale-[1.04]',
                active && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
              )}
              style={{
                backgroundImage: m.textureSet
                  ? `url(${textureUrl(m.textureSet, 'thumb')})`
                  : undefined,
                backgroundColor: m.colorHex,
              }}
            >
              {active && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** 24-colour paint palette plus a custom colour. */
export function PaintPicker({ value, onChange, label }: PickerProps & { label: string }) {
  const current = getMaterial(value);
  const isCustom = value?.startsWith('paint:') ?? false;
  return (
    <div className="space-y-2.5">
      <div role="radiogroup" aria-label={label} className="grid grid-cols-8 gap-1.5">
        {PAINTS.map((m) => {
          const active = value === m.id;
          return (
            <Tooltip key={m.id} content={m.name}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={m.name}
                onClick={() => {
                  onChange(m.id);
                }}
                className={cn(
                  'relative aspect-square rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition-transform hover:scale-110',
                  active && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                )}
                style={{ backgroundColor: m.colorHex }}
              />
            </Tooltip>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <label
          className={cn(
            'relative flex h-7 flex-1 cursor-pointer items-center gap-2 rounded-lg bg-fg/[0.04] px-2 text-xs text-fg-muted shadow-[inset_0_0_0_1px_var(--border)] hover:text-fg',
            isCustom && 'text-fg shadow-[inset_0_0_0_1.5px_var(--accent)]',
          )}
        >
          <Pipette className="size-3.5" />
          {isCustom && current?.colorHex ? (
            <>
              <span
                className="size-3.5 rounded-full"
                style={{ backgroundColor: current.colorHex }}
              />
              <span className="font-mono">{current.colorHex.toUpperCase()}</span>
            </>
          ) : (
            'Custom colour'
          )}
          <input
            type="color"
            aria-label={`${label} custom colour`}
            className="absolute inset-0 cursor-pointer opacity-0"
            value={current?.colorHex ?? '#ffffff'}
            onChange={(e) => {
              onChange(customPaintId(e.target.value));
            }}
          />
        </label>
        <button
          type="button"
          disabled={!value}
          onClick={() => {
            onChange(null);
          }}
          className="h-7 rounded-lg px-2 text-xs text-fg-muted hover:bg-fg/[0.06] hover:text-fg disabled:opacity-40"
        >
          Clear
        </button>
      </div>
      {current && <p className="text-[11px] text-fg-subtle">{current.name}</p>}
    </div>
  );
}
