import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Circle, Layer, Line, Rect, Stage } from 'react-konva';
import { distance } from '@/core/geometry/vec2';
import { openingSpan, wallFootprint } from '@/core/geometry/walls';
import { DEFAULT_WALL_THICKNESS, type Vec2 } from '@/core/types';
import { useElementSize } from '@/hooks/useElementSize';
import { selectActivePlan, usePlanStore } from '@/state/planStore';
import { useDerivedPlan } from '@/state/useDerivedPlan';
import { useUiStore } from '@/state/uiStore';
import { GRID_MAJOR, GRID_MINOR } from './constants';
import { EmptyState } from './EmptyState';
import { ScaleBar } from './ScaleBar';
import {
  Handle,
  OpeningCuts,
  OpeningShape,
  OpeningShapes,
  PaintStrips,
  RoomLabels,
  RoomShapes,
  SegmentDimension,
  WallShapes,
} from './shapes';
import { useCanvasInteraction } from './useCanvasInteraction';
import { FurnitureGhostShape, FurnitureShapes, RotateHandle } from './furnitureShapes';
import { usePatternImages } from './usePatternImages';
import { useThemeColors } from './useThemeColors';
import { getMaterial } from '@/core/estimate/defaultCosts';
import { boundsOf, fitView, flat, makeView, toScreen } from './viewport';
import { ZoomControls } from './ZoomControls';

/** The 2D floor-plan editor: a Konva stage over a CSS blueprint grid. */
export function PlanCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  const zoom = useUiStore((s) => s.zoom);
  const pan = useUiStore((s) => s.pan);
  const tool = useUiStore((s) => s.tool);
  const units = useUiStore((s) => s.units);
  const selection = useUiStore((s) => s.selection);
  const hover = useUiStore((s) => s.hover);
  const plan = usePlanStore(selectActivePlan);
  const projectId = usePlanStore((s) => s.project.id);
  const ready = usePlanStore((s) => s.ready);
  const colors = useThemeColors();

  const view = makeView(width, height, pan, zoom);
  const baseDerived = useDerivedPlan(plan);
  const ix = useCanvasInteraction(view, plan, baseDerived.rooms);
  const { previewPlan } = ix;
  const { rooms, joins } = useDerivedPlan(previewPlan);
  const patterns = usePatternImages(
    rooms.flatMap((r) => getMaterial(r.meta?.floorMaterial)?.textureSet ?? []),
  );

  // Redraw once web fonts are ready (Konva measures text on draw).
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if ('fonts' in document) void document.fonts.ready.then(bump);
  }, []);

  const fit = useCallback(() => {
    const pts = usePlanStore.getState().project.baseline.walls.flatMap((w) => [w.start, w.end]);
    const active = selectActivePlan(usePlanStore.getState()).walls.flatMap((w) => [w.start, w.end]);
    const b = boundsOf(active.length ? active : pts);
    if (!b || width === 0) {
      useUiStore.getState().resetView();
      return;
    }
    useUiStore.setState(fitView(b, width, height));
  }, [width, height]);

  // Frame the plan when a project is opened.
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || width === 0 || fittedFor.current === projectId) return;
    fittedFor.current = projectId;
    if (plan.walls.length > 0) fit();
  }, [ready, width, projectId, plan.walls.length, fit]);

  // Wheel / pinch zoom around the cursor (non-passive to block page scroll).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const at = { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
      const speed = e.ctrlKey ? 0.01 : 0.0015; // trackpad pinch reports ctrlKey + small deltas
      useUiStore.getState().zoomAt(Math.exp(-e.deltaY * speed), at);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Grid follows the plan origin.
  const major = GRID_MAJOR * view.s;
  const minor = GRID_MINOR * view.s;
  const mod = (a: number, m: number) => ((a % m) + m) % m;
  const pos = `${mod(view.ox, major) - 0.5}px ${mod(view.oy, major) - 0.5}px`;

  const selectedWall =
    selection?.kind === 'wall' ? previewPlan.walls.find((w) => w.id === selection.id) : undefined;
  const hoveredWall =
    tool === 'select' && hover?.kind === 'wall' && hover.id !== selection?.id
      ? previewPlan.walls.find((w) => w.id === hover.id)
      : undefined;
  const selectedOpening =
    selection?.kind === 'opening'
      ? previewPlan.openings.find((o) => o.id === selection.id)
      : undefined;
  const selectedFurniture =
    selection?.kind === 'furniture'
      ? previewPlan.furniture.find((f) => f.id === selection.id)
      : undefined;
  const corner = ix.activeCorner;
  const cornerWalls = corner
    ? previewPlan.walls.filter(
        (w) => distance(w.start, corner) < 1e-6 || distance(w.end, corner) < 1e-6,
      )
    : [];

  const preview =
    tool === 'wall' && ix.chain && ix.snap && distance(ix.chain.anchor, ix.snap.point) > 0.01
      ? { start: ix.chain.anchor, end: ix.snap.point, thickness: DEFAULT_WALL_THICKNESS }
      : null;

  const showEmpty = previewPlan.walls.length === 0 && !ix.chain && ready;

  return (
    <div
      ref={ref}
      data-testid="plan-canvas"
      className="blueprint-grid relative h-full w-full touch-none overflow-hidden select-none"
      style={{
        cursor: ix.cursor,
        backgroundSize: `${major}px ${major}px, ${major}px ${major}px, ${minor}px ${minor}px, ${minor}px ${minor}px`,
        backgroundPosition: `${pos}, ${pos}, ${pos}, ${pos}`,
      }}
      onPointerDown={ix.onPointerDown}
      onPointerMove={ix.onPointerMove}
      onPointerUp={ix.onPointerUp}
      onPointerLeave={ix.onPointerLeave}
      onContextMenu={ix.onContextMenu}
      onDoubleClick={ix.onDoubleClick}
      onDragOver={ix.onDragOver}
      onDrop={ix.onDrop}
      onDragLeave={ix.onDragLeave}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--canvas)_100%)] opacity-70" />

      {width > 0 && (
        <Stage width={width} height={height} listening={false} className="absolute inset-0">
          <Layer listening={false}>
            {/* Walls, then openings erase them, then rooms are drawn underneath. */}
            <WallShapes
              pass="base"
              walls={previewPlan.walls}
              joins={joins}
              view={view}
              colors={colors}
              selection={selection}
              hover={hover}
            />
            <PaintStrips walls={previewPlan.walls} view={view} />
            <OpeningCuts openings={previewPlan.openings} walls={previewPlan.walls} view={view} />
            <RoomShapes
              rooms={rooms}
              view={view}
              colors={colors}
              selection={selection}
              hover={hover}
              behind
              patterns={patterns}
            />
            <WallShapes
              pass="highlight"
              walls={previewPlan.walls}
              joins={joins}
              view={view}
              colors={colors}
              selection={selection}
              hover={hover}
              danger={tool === 'delete'}
            />
            <OpeningShapes
              openings={previewPlan.openings}
              walls={previewPlan.walls}
              view={view}
              colors={colors}
              selection={selection}
              hover={hover}
              danger={tool === 'delete'}
            />
            <FurnitureShapes
              items={previewPlan.furniture}
              view={view}
              colors={colors}
              selection={selection}
              hover={hover}
              danger={tool === 'delete'}
            />
            <RoomLabels rooms={rooms} view={view} colors={colors} units={units} />

            {/* Dimensions */}
            {selectedWall && (
              <SegmentDimension
                a={selectedWall.start}
                b={selectedWall.end}
                offset={selectedWall.thickness / 2}
                view={view}
                colors={colors}
                units={units}
                accent
              />
            )}
            {hoveredWall && (
              <SegmentDimension
                a={hoveredWall.start}
                b={hoveredWall.end}
                offset={hoveredWall.thickness / 2}
                view={view}
                colors={colors}
                units={units}
              />
            )}
            {cornerWalls.map((w) => (
              <SegmentDimension
                key={w.id}
                a={w.start}
                b={w.end}
                offset={w.thickness / 2}
                view={view}
                colors={colors}
                units={units}
                accent
              />
            ))}
            {selectedOpening &&
              (() => {
                const w = previewPlan.walls.find((x) => x.id === selectedOpening.wallId);
                if (!w) return null;
                const span = openingSpan(selectedOpening, w);
                return (
                  <SegmentDimension
                    a={span.start}
                    b={span.end}
                    offset={w.thickness / 2}
                    view={view}
                    colors={colors}
                    units={units}
                    accent
                  />
                );
              })()}

            {/* Handles */}
            {selectedWall && !ix.activeCorner && (
              <>
                <Handle at={toScreen(selectedWall.start, view)} colors={colors} />
                <Handle at={toScreen(selectedWall.end, view)} colors={colors} />
              </>
            )}
            {tool === 'select' && ix.hoverCorner && !ix.activeCorner && (
              <Handle at={toScreen(ix.hoverCorner, view)} colors={colors} />
            )}
            {ix.activeCorner && (
              <Handle at={toScreen(ix.activeCorner, view)} colors={colors} active />
            )}

            {/* Wall tool preview */}
            {preview && (
              <>
                <Line
                  points={flat(wallFootprint(preview), view)}
                  closed
                  fill={colors.accentSoft}
                  stroke={colors.accent}
                  strokeWidth={1.5}
                />
                <SegmentDimension
                  a={preview.start}
                  b={preview.end}
                  offset={preview.thickness / 2}
                  view={view}
                  colors={colors}
                  units={units}
                  accent
                />
              </>
            )}
            {tool === 'wall' && ix.chain && (
              <Circle {...toScreen(ix.chain.anchor, view)} radius={4} fill={colors.accent} />
            )}
            {tool === 'wall' && ix.snap && (
              <SnapMarker
                kind={ix.snap.kind}
                at={toScreen(ix.snap.point, view)}
                color={colors.accent}
              />
            )}
            {tool === 'select' && ix.activeCorner && ix.snap && (
              <SnapMarker
                kind={ix.snap.kind}
                at={toScreen(ix.snap.point, view)}
                color={colors.accent}
              />
            )}

            {/* Furniture rotate handle + placement ghost */}
            {selectedFurniture && tool === 'select' && (
              <RotateHandle item={selectedFurniture} view={view} colors={colors} />
            )}
            {ix.furnitureGhost && (
              <FurnitureGhostShape
                item={ix.furnitureGhost.item}
                valid={ix.furnitureGhost.valid}
                view={view}
                colors={colors}
              />
            )}

            {/* Door / window ghost */}
            {ix.ghost && (
              <OpeningShape
                opening={ix.ghost.opening}
                wall={ix.ghost.wall}
                view={view}
                colors={colors}
                tint={ix.ghost.valid ? colors.accent : colors.danger}
                ghost
              />
            )}
          </Layer>
        </Stage>
      )}

      {showEmpty && <EmptyState />}

      <div className="pointer-events-none absolute bottom-4 left-4 sm:left-20">
        <ScaleBar />
      </div>
      <div className="pointer-events-none absolute right-4 bottom-4">
        <ZoomControls onFit={fit} />
      </div>
    </div>
  );
}

function SnapMarker({ kind, at, color }: { kind: string; at: Vec2; color: string }) {
  if (kind === 'endpoint')
    return <Circle x={at.x} y={at.y} radius={8} stroke={color} strokeWidth={2} />;
  if (kind === 'wall')
    return (
      <Rect
        x={at.x}
        y={at.y}
        width={10}
        height={10}
        offsetX={5}
        offsetY={5}
        rotation={45}
        stroke={color}
        strokeWidth={2}
      />
    );
  return (
    <>
      <Line points={[at.x - 6, at.y, at.x + 6, at.y]} stroke={color} strokeWidth={1.5} />
      <Line points={[at.x, at.y - 6, at.x, at.y + 6]} stroke={color} strokeWidth={1.5} />
    </>
  );
}
