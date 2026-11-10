import { formatScaleLabel, niceScaleLength } from '@/core/units';
import { useUiStore } from '@/state/uiStore';
import { PX_PER_METRE } from './constants';

export function ScaleBar() {
  const zoom = useUiStore((s) => s.zoom);
  const units = useUiStore((s) => s.units);
  const pxPerMetre = PX_PER_METRE * zoom;
  const metres = niceScaleLength(pxPerMetre, units);
  const width = metres * pxPerMetre;

  return (
    <div
      className="flex flex-col gap-1 select-none"
      aria-label={`Scale: ${formatScaleLabel(metres, units)}`}
    >
      <span className="font-mono text-[10px] text-fg-muted">{formatScaleLabel(metres, units)}</span>
      <div
        className="h-1.5 border-x border-b border-fg-subtle transition-[width] duration-200"
        style={{ width }}
      />
    </div>
  );
}
