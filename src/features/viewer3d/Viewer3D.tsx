import { Environment, Grid } from '@react-three/drei';
import { Canvas, useThree, type RootState } from '@react-three/fiber';
import {
  ArrowLeft,
  Footprints,
  Layers2,
  Map as MapIcon,
  Maximize,
  MousePointer2,
  Rotate3d,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { canPlaceFurniture } from '@/core/furniture/placement';
import { snapToGrid } from '@/core/geometry/snapping';
import { wallEndCuts } from '@/core/geometry/wallEnds';
import { getDraggingModel, setDraggingModel } from '@/features/furniture/dragState';
import { FURNITURE_MIME } from '@/features/furniture/FurnitureCatalog';
import { createId } from '@/lib/id';
import { IconButton, Kbd, SegmentedControl, Tooltip, type SegmentOption } from '@/components/ui';
import type { Plan } from '@/core/types';
import { useThemeColors } from '@/features/editor2d/useThemeColors';
import { cn } from '@/lib/cn';
import { getPlan, type PlanKind } from '@/core/project';
import { usePlanStore } from '@/state/planStore';
import { useDerivedPlan } from '@/state/useDerivedPlan';
import { useUiStore, type CameraMode } from '@/state/uiStore';
import { CameraRig, type SceneBounds } from './CameraRig';
import { PlanModel } from './PlanModel';

const HDRI = '/assets/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr';

const MODE_OPTIONS: readonly SegmentOption<CameraMode>[] = [
  {
    value: 'orbit',
    label: (
      <>
        <Rotate3d className="size-3.5" />
        Orbit
      </>
    ),
    ariaLabel: 'Orbit camera',
    tooltip: 'Drag to orbit · scroll to zoom',
  },
  {
    value: 'top',
    label: (
      <>
        <MapIcon className="size-3.5" />
        Top
      </>
    ),
    ariaLabel: 'Top-down camera',
    tooltip: 'Top-down plan view',
  },
  {
    value: 'walk',
    label: (
      <>
        <Footprints className="size-3.5" />
        Walk
      </>
    ),
    ariaLabel: 'Walk camera',
    tooltip: 'Walk through at eye level',
  },
];

function boundsOf(plan: Plan): SceneBounds {
  if (plan.walls.length === 0) return { cx: 0, cz: 0, size: 8 };
  const pts = plan.walls.flatMap((w) => [w.start, w.end]);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    cx: (minX + maxX) / 2,
    cz: -(minY + maxY) / 2,
    size: Math.max(maxX - minX, maxY - minY, 2),
  };
}

/** Exposes the R3F state outside the Canvas (for drag-and-drop raycasts). */
function StateBridge({ stateRef }: { stateRef: RefObject<(() => RootState) | null> }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    stateRef.current = get;
  }, [get, stateRef]);
  return null;
}

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();

function usePointerLocked() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const on = () => {
      setLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', on);
    return () => {
      document.removeEventListener('pointerlockchange', on);
    };
  }, []);
  return locked;
}

/** Live 3D view of the active plan (react-three-fiber). */
const COMPARE_OPTIONS: readonly SegmentOption<PlanKind>[] = [
  {
    value: 'baseline',
    label: 'Before',
    ariaLabel: 'Show current home',
    tooltip: 'Your home today',
  },
  {
    value: 'planned',
    label: 'After',
    ariaLabel: 'Show renovation',
    tooltip: 'After the renovation',
  },
];

export default function Viewer3D() {
  const project = usePlanStore((s) => s.project);
  const activeKind = usePlanStore((s) => s.activeKind);
  // Before/after: view either version without changing which one you're editing.
  const [viewKind, setViewKind] = useState<PlanKind | null>(null);
  const shownKind = project.planned ? (viewKind ?? activeKind) : 'baseline';
  const plan = getPlan(project, shownKind);
  const interactive = shownKind === activeKind;
  const projectId = usePlanStore((s) => s.project.id);
  const mode = useUiStore((s) => s.cameraMode);
  const setMode = useUiStore((s) => s.setCameraMode);
  const showCeilings = useUiStore((s) => s.showCeilings);
  const setShowCeilings = useUiStore((s) => s.setShowCeilings);
  const theme = useUiStore((s) => s.theme);
  const colors = useThemeColors();
  const { rooms } = useDerivedPlan(plan);
  // Mitred / butted wall ends so no two walls overlap (no corner z-fighting).
  const cuts = useMemo(() => wallEndCuts(plan.walls), [plan.walls]);
  const locked = usePointerLocked();

  // Esc releases the mouse first; a second Esc (or the button) leaves walk mode.
  useEffect(() => {
    if (mode !== 'walk' || locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode('orbit');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [mode, locked, setMode]);

  const bounds = useMemo(() => boundsOf(plan), [plan]);
  const hasWalls = plan.walls.length > 0;

  // Re-frame when the project changes, the first wall appears, or on request.
  const [manualFit, setManualFit] = useState(0);
  const fitKey = useMemo(() => manualFit * 1000 + (hasWalls ? 1 : 0), [manualFit, hasWalls]);
  const [prevProject, setPrevProject] = useState(projectId);
  if (prevProject !== projectId) {
    setPrevProject(projectId);
    setManualFit((n) => n + 1);
  }

  const ceilings = mode === 'walk' || showCeilings;
  const threeRef = useRef<(() => RootState) | null>(null);
  const execute = usePlanStore((s) => s.execute);

  /** Plan-space point on the floor under a screen position, or null. */
  const floorPointAt = (e: React.DragEvent<HTMLDivElement>) => {
    const get = threeRef.current;
    if (!get) return null;
    const { camera } = get();
    const r = e.currentTarget.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.ray.intersectPlane(FLOOR, new THREE.Vector3());
    return hit ? snapToGrid({ x: hit.x, y: -hit.z }, 0.05) : null;
  };
  const shadowExtent = bounds.size * 0.9 + 4;

  return (
    <div
      data-testid="viewer-3d"
      onDragOver={(e) => {
        if (interactive && getDraggingModel() && e.dataTransfer.types.includes(FURNITURE_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        const modelId = e.dataTransfer.getData(FURNITURE_MIME) || getDraggingModel();
        setDraggingModel(null);
        const at = modelId && interactive ? floorPointAt(e) : null;
        if (!modelId || !at) return;
        e.preventDefault();
        const item = { id: createId(), modelId, position: at, rotation: 0 };
        if (!canPlaceFurniture(item, plan)) return;
        execute({ type: 'addFurniture', item });
        useUiStore.getState().setTool('select');
        useUiStore.getState().select({ kind: 'furniture', id: item.id });
      }}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_15%,var(--surface-2),var(--canvas)_75%)]"
    >
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        // No tone mapping: paint and texture colours render as picked (the default
        // ACES curve darkens and shifts them). Lighting is balanced to stay in range.
        flat
      >
        <Suspense fallback={null}>
          <Environment files={HDRI} environmentIntensity={0.35} />
        </Suspense>
        {/* Same lighting in both UI themes, with a strong even fill and a gentle sun, so
            every wall face reads as its real paint colour with just a hint of depth. */}
        <ambientLight intensity={1.6} />
        <directionalLight
          castShadow
          position={[bounds.cx + 8, 14, bounds.cz + 6]}
          intensity={0.6}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-shadowExtent}
          shadow-camera-right={shadowExtent}
          shadow-camera-top={shadowExtent}
          shadow-camera-bottom={-shadowExtent}
          shadow-camera-far={60}
        >
          <object3D attach="target" position={[bounds.cx, 0, bounds.cz]} />
        </directionalLight>

        <PlanModel
          plan={plan}
          rooms={rooms}
          cuts={cuts}
          ceilings={ceilings}
          accent={colors.accent}
        />

        {/* Ground: shadow catcher + subtle grid. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <shadowMaterial transparent opacity={theme === 'dark' ? 0.35 : 0.18} />
        </mesh>
        <Grid
          position={[0, -0.002, 0]}
          infiniteGrid
          cellSize={0.5}
          cellThickness={0.6}
          cellColor={theme === 'dark' ? '#2a3445' : '#cbd3df'}
          sectionSize={2}
          sectionThickness={1}
          sectionColor={theme === 'dark' ? '#3d4c64' : '#a7b3c5'}
          fadeDistance={Math.max(40, bounds.size * 4)}
          fadeStrength={1.5}
        />

        <StateBridge stateRef={threeRef} />
        <CameraRig mode={mode} bounds={bounds} plan={plan} rooms={rooms} fitKey={fitKey} />
      </Canvas>

      {/* Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl bg-surface/85 p-1 shadow-float backdrop-blur-xl">
          {project.planned && (
            <>
              <SegmentedControl
                ariaLabel="Before or after"
                size="sm"
                value={shownKind}
                onChange={(k) => {
                  setViewKind(k === activeKind ? null : k);
                }}
                options={COMPARE_OPTIONS}
              />
              <div className="mx-0.5 h-4 w-px bg-border" />
            </>
          )}
          <SegmentedControl
            ariaLabel="Camera mode"
            size="sm"
            value={mode}
            onChange={setMode}
            options={MODE_OPTIONS}
          />
          <div className="mx-0.5 h-4 w-px bg-border" />
          <Tooltip
            content={
              ceilings ? 'Hide ceilings' : 'Show ceilings · choose a finish in a room’s Ceiling tab'
            }
          >
            <span className="inline-flex">
              <IconButton
                size="sm"
                label="Toggle ceilings"
                aria-pressed={ceilings}
                disabled={mode === 'walk'}
                className={cn(ceilings && 'text-accent')}
                onClick={() => {
                  setShowCeilings(!showCeilings);
                }}
              >
                <Layers2 className="size-3.5" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip content="Re-frame">
            <IconButton
              size="sm"
              label="Re-frame camera"
              onClick={() => {
                setManualFit((n) => n + 1);
              }}
            >
              <Maximize className="size-3.5" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {!interactive && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
          <span className="rounded-full bg-surface/85 px-3 py-1.5 text-xs text-fg-muted shadow-float backdrop-blur-xl">
            Viewing {shownKind === 'baseline' ? 'your current home' : 'the renovation'} · read-only
          </span>
        </div>
      )}

      {!hasWalls && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <p className="rounded-full bg-surface/85 px-4 py-2 text-sm text-fg-muted shadow-float backdrop-blur-xl">
            Draw walls in 2D and they’ll rise here instantly.
          </p>
        </div>
      )}

      {mode === 'walk' && !locked && hasWalls && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg/30 backdrop-blur-[2px]">
          <button
            id="walk-start"
            type="button"
            className="flex flex-col items-center gap-3 rounded-2xl bg-surface/90 px-6 py-5 text-center shadow-float backdrop-blur-xl transition-transform hover:scale-[1.02]"
          >
            <span className="bg-accent-gradient flex size-10 items-center justify-center rounded-xl text-white shadow-glow">
              <MousePointer2 className="size-5" />
            </span>
            <span className="text-sm font-semibold text-fg">Click to walk around</span>
            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Kbd>W</Kbd>
              <Kbd>A</Kbd>
              <Kbd>S</Kbd>
              <Kbd>D</Kbd> move · <Kbd>Shift</Kbd> run · <Kbd>Esc</Kbd> release
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('orbit');
            }}
            className="flex items-center gap-1.5 rounded-full bg-surface/90 px-3.5 py-1.5 text-xs font-medium text-fg-muted shadow-float backdrop-blur-xl transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3.5" /> Back to orbit
            <Kbd>Esc</Kbd>
          </button>
        </div>
      )}
    </div>
  );
}
