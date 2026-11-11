import {
  MapControls,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  PointerLockControls,
} from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { slideMove } from '@/core/geometry/collision';
import { pointInPolygon } from '@/core/geometry/polygon';
import type { ResolvedRoom } from '@/core/rooms';
import type { Plan } from '@/core/types';
import type { CameraMode } from '@/state/uiStore';

export interface SceneBounds {
  cx: number;
  cz: number;
  size: number;
}

export const EYE_HEIGHT = 1.6;
const WALK_SPEED = 2.2; // m/s
const BODY_RADIUS = 0.22;

/** Keyboard state for WASD / arrow movement. */
function useKeys() {
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.code);
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => {
      keys.current.clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);
  return keys;
}

// Scratch vectors reused every frame (avoids per-frame allocation).
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function WalkMovement({ plan }: { plan: Plan }) {
  const keys = useKeys();
  const camera = useThree((s) => s.camera);

  useFrame((_, dt) => {
    const k = keys.current;
    const f =
      (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const r =
      (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) -
      (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (f === 0 && r === 0) return;
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    const step = WALK_SPEED * Math.min(dt, 0.05) * (k.has('ShiftLeft') ? 1.8 : 1);
    const dx = (forward.x * f + right.x * r) * step;
    const dz = (forward.z * f + right.z * r) * step;
    // Plan space: x = x, y = -z.
    const from = { x: camera.position.x, y: -camera.position.z };
    const to = slideMove(plan, from, { x: from.x + dx, y: from.y - dz }, BODY_RADIUS);
    camera.position.set(to.x, EYE_HEIGHT, -to.y);
  });
  return null;
}

/** A good place to stand: the centre of the largest room, else the plan centre. */
function walkStart(rooms: readonly ResolvedRoom[], b: SceneBounds): [number, number, number] {
  const biggest = [...rooms].sort((x, y) => y.area - x.area)[0];
  if (biggest && pointInPolygon(biggest.labelAt, biggest.polygon)) {
    return [biggest.labelAt.x, EYE_HEIGHT, -biggest.labelAt.y];
  }
  return [b.cx, EYE_HEIGHT, b.cz];
}

interface CameraRigProps {
  mode: CameraMode;
  bounds: SceneBounds;
  plan: Plan;
  rooms: readonly ResolvedRoom[];
  /** Changes whenever the view should be re-framed. */
  fitKey: number;
}

export function CameraRig({ mode, bounds, plan, rooms, fitKey }: CameraRigProps) {
  const { cx, cz, size } = bounds;
  const size3 = useThree((s) => s.size);

  if (mode === 'top') {
    const zoom = Math.min(size3.width, size3.height) / (size * 1.25);
    return (
      <>
        <OrthographicCamera
          key={`top-${fitKey}`}
          makeDefault
          position={[cx, 60, cz]}
          up={[0, 0, -1]}
          zoom={zoom}
          near={0.1}
          far={200}
          onUpdate={(c) => {
            c.lookAt(cx, 0, cz);
          }}
        />
        <MapControls
          key={`map-${fitKey}`}
          makeDefault
          target={[cx, 0, cz]}
          enableRotate={false}
          screenSpacePanning
          enableDamping
        />
      </>
    );
  }

  if (mode === 'walk') {
    return (
      <>
        <PerspectiveCamera
          key={`walk-${fitKey}`}
          makeDefault
          fov={70}
          near={0.05}
          far={300}
          position={walkStart(rooms, bounds)}
        />
        <PointerLockControls selector="#walk-start" />
        <WalkMovement plan={plan} />
      </>
    );
  }

  // Distance that fits a sphere around the plan in the view, for any aspect ratio.
  const fov = 40;
  const radius = Math.max(size, 4) * 0.72;
  const aspect = size3.width / Math.max(1, size3.height);
  const d = radius / Math.sin(((fov / 2) * Math.PI) / 180) / Math.min(1, aspect);
  const dir = new THREE.Vector3(0.55, 0.62, 0.56).normalize().multiplyScalar(d);
  return (
    <>
      <PerspectiveCamera
        key={`orbit-${fitKey}`}
        makeDefault
        fov={fov}
        near={0.1}
        far={500}
        position={[cx + dir.x, dir.y, cz + dir.z]}
      />
      <OrbitControls
        key={`orbit-ctl-${fitKey}`}
        makeDefault
        target={[cx, 0.6, cz]}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1.5}
        maxDistance={Math.max(60, size * 4)}
      />
    </>
  );
}
