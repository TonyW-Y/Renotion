import { Maximize, Minus, Plus } from 'lucide-react';
import { IconButton, Tooltip } from '@/components/ui';
import { useUiStore, ZOOM_MAX, ZOOM_MIN } from '@/state/uiStore';

export function ZoomControls({ onFit }: { onFit: () => void }) {
  const zoom = useUiStore((s) => s.zoom);
  const zoomBy = useUiStore((s) => s.zoomBy);
  const resetView = useUiStore((s) => s.resetView);

  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl bg-surface/85 p-1 shadow-float backdrop-blur-xl">
      <IconButton
        size="sm"
        label="Zoom out"
        disabled={zoom <= ZOOM_MIN}
        onClick={() => {
          zoomBy(1 / 1.25);
        }}
      >
        <Minus className="size-3.5" />
      </IconButton>
      <Tooltip content="Reset view" side="top">
        <button
          type="button"
          onClick={resetView}
          className="tabular h-7 w-12 rounded-md font-mono text-[11px] text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
        >
          {Math.round(zoom * 100)}%
        </button>
      </Tooltip>
      <IconButton
        size="sm"
        label="Zoom in"
        disabled={zoom >= ZOOM_MAX}
        onClick={() => {
          zoomBy(1.25);
        }}
      >
        <Plus className="size-3.5" />
      </IconButton>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <Tooltip content="Zoom to fit" side="top">
        <IconButton size="sm" label="Zoom to fit" onClick={onFit}>
          <Maximize className="size-3.5" />
        </IconButton>
      </Tooltip>
    </div>
  );
}
