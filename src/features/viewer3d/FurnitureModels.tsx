import { Instance, Instances } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { FURNITURE_BY_ID, type FurnitureModel, type FurniturePart } from '@/core/furniture/catalog';
import type { FurnitureItem } from '@/core/types';
import { useUiStore } from '@/state/uiStore';

/** Unit geometries, scaled per instance by the part's size. */
const UNIT: Record<FurniturePart['shape'], THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 28),
  sphere: new THREE.SphereGeometry(0.5, 24, 16),
};

const GLASS = '#bcd9ea';
const materials = new Map<string, THREE.MeshStandardMaterial>();
function colorMaterial(color: string, tint?: string): THREE.MeshStandardMaterial {
  const key = `${color}|${tint ?? ''}`;
  let m = materials.get(key);
  if (!m) {
    m =
      color === GLASS
        ? new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.3,
            roughness: 0.05,
            depthWrite: false,
          })
        : new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
    if (tint) {
      m.emissive = new THREE.Color(tint);
      m.emissiveIntensity = 0.35;
    }
    materials.set(key, m);
  }
  return m;
}

/** World transform of one part of one item (plan y → world −z). */
function partTransform(item: FurnitureItem, part: FurniturePart) {
  const [x, y, z] = part.position;
  const c = Math.cos(item.rotation);
  const s = Math.sin(item.rotation);
  return {
    position: [item.position.x + x * c + z * s, y, -item.position.y - x * s + z * c] as [
      number,
      number,
      number,
    ],
    rotation: [0, item.rotation, 0] as [number, number, number],
  };
}

function events(id: string, interactive: boolean) {
  if (!interactive) return {};
  const target = { kind: 'furniture' as const, id };
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > 4) return;
      e.stopPropagation();
      useUiStore.getState().select(target);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      useUiStore.getState().setHover(target);
    },
    onPointerOut: () => {
      const h = useUiStore.getState().hover;
      if (h?.kind === 'furniture' && h.id === id) useUiStore.getState().setHover(null);
    },
  };
}

/** All copies of one model: one InstancedMesh per part. */
function ModelInstances({
  model,
  items,
  interactive,
}: {
  model: FurnitureModel;
  items: FurnitureItem[];
  interactive: boolean;
}) {
  return (
    <>
      {model.parts.map((part, pi) => (
        <Instances
          key={`${pi}-${items.length}`}
          limit={items.length}
          geometry={UNIT[part.shape]}
          material={colorMaterial(part.color)}
          castShadow
          receiveShadow
        >
          {items.map((item) => {
            const t = partTransform(item, part);
            return (
              <Instance
                key={item.id}
                position={t.position}
                rotation={t.rotation}
                scale={part.size}
                {...events(item.id, interactive)}
              />
            );
          })}
        </Instances>
      ))}
    </>
  );
}

/** A single highlighted item (selected / hovered), drawn without instancing. */
function HighlightedItem({
  item,
  model,
  tint,
  interactive,
}: {
  item: FurnitureItem;
  model: FurnitureModel;
  tint: string;
  interactive: boolean;
}) {
  return (
    <group {...events(item.id, interactive)}>
      {model.parts.map((part, i) => {
        const t = partTransform(item, part);
        return (
          <mesh
            key={i}
            geometry={UNIT[part.shape]}
            material={colorMaterial(part.color, tint)}
            position={t.position}
            rotation={t.rotation}
            scale={part.size}
            castShadow
          />
        );
      })}
    </group>
  );
}

export function FurnitureModels({
  items,
  interactive,
  accent,
}: {
  items: readonly FurnitureItem[];
  interactive: boolean;
  accent: string;
}) {
  const selection = useUiStore((s) => s.selection);
  const hover = useUiStore((s) => s.hover);
  const hotKey = interactive
    ? [
        selection?.kind === 'furniture' ? selection.id : '',
        hover?.kind === 'furniture' ? hover.id : '',
      ].join('|')
    : '|';
  const hot = useMemo(() => new Set(hotKey.split('|').filter(Boolean)), [hotKey]);

  const groups = useMemo(() => {
    const m = new Map<string, FurnitureItem[]>();
    for (const item of items) {
      if (hot.has(item.id)) continue;
      m.set(item.modelId, [...(m.get(item.modelId) ?? []), item]);
    }
    return [...m.entries()];
  }, [items, hot]);

  return (
    <>
      {groups.map(([modelId, list]) => {
        const model = FURNITURE_BY_ID.get(modelId);
        return model ? (
          <ModelInstances key={modelId} model={model} items={list} interactive={interactive} />
        ) : null;
      })}
      {items
        .filter((i) => isHot(i.id))
        .map((item) => {
          const model = FURNITURE_BY_ID.get(item.modelId);
          return model ? (
            <HighlightedItem
              key={item.id}
              item={item}
              model={model}
              tint={accent}
              interactive={interactive}
            />
          ) : null;
        })}
    </>
  );
}
