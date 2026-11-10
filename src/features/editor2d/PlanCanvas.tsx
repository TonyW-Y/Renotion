import { useEffect, useRef } from 'react';
import { useElementSize } from '@/hooks/useElementSize';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/state/uiStore';
import { GRID_MAJOR, GRID_MINOR, PX_PER_METRE } from './constants';
import { EmptyState } from './EmptyState';
import { ScaleBar } from './ScaleBar';
import { ZoomControls } from './ZoomControls';

/**
 * Phase 0 placeholder for the 2D editor: a zoomable blueprint grid centred on
 * the plan origin. The Konva stage replaces the grid body in Phase 1.
 */
export function PlanCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  const zoom = useUiStore((s) => s.zoom);
  const tool = useUiStore((s) => s.tool);
  const setCursor = useUiStore((s) => s.setCursor);
  const zoomBy = useUiStore((s) => s.zoomBy);

  const pxPerMetre = PX_PER_METRE * zoom;
  const major = GRID_MAJOR * pxPerMetre;
  const minor = GRID_MINOR * pxPerMetre;
  const ox = (width / 2) % major;
  const oy = (height / 2) % major;
  const pos = `${ox - 0.5}px ${oy - 0.5}px`;

  // Wheel zoom needs a non-passive listener so we can prevent page scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [zoomBy]);

  return (
    <div
      ref={ref}
      data-testid="plan-canvas"
      className={cn(
        'blueprint-grid relative h-full w-full overflow-hidden',
        tool === 'select' ? 'cursor-default' : 'cursor-crosshair',
      )}
      style={{
        backgroundSize: `${major}px ${major}px, ${major}px ${major}px, ${minor}px ${minor}px, ${minor}px ${minor}px`,
        backgroundPosition: `${pos}, ${pos}, ${pos}, ${pos}`,
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCursor({
          x: (e.clientX - rect.left - rect.width / 2) / pxPerMetre,
          y: -(e.clientY - rect.top - rect.height / 2) / pxPerMetre,
        });
      }}
      onPointerLeave={() => {
        setCursor(null);
      }}
    >
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--canvas)_100%)] opacity-80" />

      {/* Origin marker */}
      <div className="pointer-events-none absolute top-1/2 left-1/2" aria-hidden="true">
        <div className="absolute -left-2 h-px w-4 bg-accent/70" />
        <div className="absolute -top-2 h-4 w-px bg-accent/70" />
        <span className="absolute top-1.5 left-1.5 font-mono text-[9px] text-fg-subtle">0,0</span>
      </div>

      <EmptyState />

      <div className="pointer-events-none absolute bottom-4 left-4 sm:left-20">
        <ScaleBar />
      </div>
      <div className="pointer-events-none absolute right-4 bottom-4">
        <ZoomControls />
      </div>
    </div>
  );
}
