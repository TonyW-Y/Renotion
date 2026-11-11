import type { ChangeEvent } from '../diff';
import type { Material, MaterialUnit } from '../types';
import { openingMaterialId } from '../openings';
import { customPaintId, furnitureMaterialId, getMaterial, SQFT_PER_SQM } from './defaultCosts';
import {
  baseboardMetres,
  drywallSheets,
  flooringQuantity,
  paintGallons,
  toLinearFeet,
} from './quantities';

export type CostCategory =
  | 'flooring'
  | 'tile'
  | 'paint'
  | 'trim'
  | 'drywall'
  | 'doors'
  | 'windows'
  | 'demolition'
  | 'furniture'
  | 'wallFinish'
  | 'ceiling';

export const CATEGORY_LABELS: Record<CostCategory, string> = {
  flooring: 'Flooring',
  tile: 'Tile',
  paint: 'Paint',
  trim: 'Trim',
  drywall: 'Drywall',
  doors: 'Doors',
  windows: 'Windows',
  demolition: 'Demolition',
  furniture: 'Furniture',
  wallFinish: 'Wall finishes',
  ceiling: 'Ceilings',
};

export interface LineItem {
  id: string;
  roomKey: string | null;
  roomName: string;
  category: CostCategory;
  materialId: string;
  description: string;
  quantity: number;
  unit: MaterialUnit;
  unitCost: number;
  total: number;
  /** Short explanation of the quantity, e.g. "12.0 m² + 10% waste". */
  basis: string;
  /** Priced with the user's own number (not editable from the estimate). */
  userPriced?: boolean;
}

export interface Subtotal<K> {
  key: K;
  label: string;
  total: number;
}

export interface Estimate {
  lines: LineItem[];
  byRoom: Subtotal<string | null>[];
  byCategory: Subtotal<CostCategory>[];
  total: number;
}

/** Per-project price overrides (CAD per unit), keyed by material id. */
export type CostOverrides = Readonly<Record<string, number>>;

export const BASEBOARD_MATERIAL = 'baseboard-mdf';
export const DRYWALL_MATERIAL = 'drywall-sheet';
export const DOOR_MATERIAL = 'interior-door';
export const WINDOW_MATERIAL = 'window-unit';
export const REMOVAL_MATERIAL = 'wall-removal';
export const REFINISH_MATERIAL = 'opening-refinish';

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Accumulator {
  roomKey: string | null;
  roomName: string;
  material: Material;
  amount: number;
}

/** Turns change events into priced line items with room / category subtotals. */
export function buildEstimate(
  events: readonly ChangeEvent[],
  overrides: CostOverrides = {},
): Estimate {
  const price = (m: Material) => overrides[m.id] ?? m.costPerUnit;
  const lines: LineItem[] = [];
  const push = (
    a: Pick<
      LineItem,
      'roomKey' | 'roomName' | 'category' | 'description' | 'quantity' | 'unit' | 'basis'
    > &
      Pick<Partial<LineItem>, 'userPriced'>,
    m: Material,
    unitCost = price(m),
  ) => {
    if (a.quantity <= 0) return;
    lines.push({
      ...a,
      id: `${a.category}:${a.roomKey ?? 'ext'}:${m.id}:${lines.length}`,
      materialId: m.id,
      unitCost,
      total: round2(a.quantity * unitCost),
    });
  };

  // Paint and drywall are pooled per room (and colour) before rounding up,
  // so ten small walls don't each round up to a whole gallon.
  const paint = new Map<string, Accumulator>();
  const drywall = new Map<string, Accumulator>();
  const wallFinish = new Map<string, Accumulator>();
  const ceilings = new Map<string, Accumulator>();
  const pool = (
    map: Map<string, Accumulator>,
    roomKey: string | null,
    roomName: string,
    material: Material,
    amount: number,
  ) => {
    const k = `${roomKey ?? ''}|${material.id}`;
    const cur = map.get(k);
    if (cur) cur.amount += amount;
    else map.set(k, { roomKey, roomName, material, amount });
  };

  const counts = new Map<string, Accumulator>();
  const refinish = new Map<string, Accumulator>();
  const furniture = new Map<string, Accumulator & { factor: number; custom?: number }>();

  for (const e of events) {
    switch (e.type) {
      case 'floorChanged': {
        const m = getMaterial(e.to);
        if (!m) break;
        const q = flooringQuantity(e.area, m);
        push(
          {
            roomKey: e.roomKey,
            roomName: e.roomName,
            category: m.category === 'tile' ? 'tile' : 'flooring',
            description: m.name,
            quantity: q.quantity,
            unit: q.unit,
            basis: `${e.area.toFixed(1)} m² + ${Math.round(m.wasteFactor * 100)}% waste`,
          },
          m,
        );
        const trim = getMaterial(BASEBOARD_MATERIAL);
        if (trim) {
          const metres = baseboardMetres(e.perimeter, e.doorWidths);
          push(
            {
              roomKey: e.roomKey,
              roomName: e.roomName,
              category: 'trim',
              description: trim.name,
              quantity: toLinearFeet(metres),
              unit: 'lft',
              basis: `${e.perimeter.toFixed(1)} m perimeter − doors + 10% waste`,
            },
            trim,
          );
        }
        break;
      }
      case 'wallPainted': {
        const finish = getMaterial(e.to);
        if (!finish) break;
        // Recolouring an existing textured finish = painting / staining it.
        const m =
          finish.category === 'wallFinish' && e.tintOnly && e.tint
            ? getMaterial(customPaintId(e.tint))
            : finish;
        if (!m) break;
        const target = m.category === 'wallFinish' ? wallFinish : paint;
        for (const s of e.shares) pool(target, s.roomKey, s.roomName, m, s.area);
        break;
      }
      case 'wallAdded': {
        const m = getMaterial(DRYWALL_MATERIAL);
        if (!m) break;
        for (const s of e.shares) pool(drywall, s.roomKey, s.roomName, m, s.area);
        break;
      }
      case 'wallRemoved': {
        const m = getMaterial(REMOVAL_MATERIAL);
        if (m) pool(counts, e.roomKey, e.roomName, m, 1);
        break;
      }
      case 'openingAdded': {
        const m = getMaterial(
          openingMaterialId({ type: e.kind, ...(e.style ? { style: e.style } : {}) }),
        );
        if (m) pool(counts, e.roomKey, e.roomName, m, 1);
        break;
      }
      case 'openingRefinished': {
        const m = getMaterial(REFINISH_MATERIAL);
        if (m) pool(refinish, e.roomKey, e.roomName, m, 1);
        break;
      }
      case 'openingRemoved':
        break;
      case 'ceilingChanged': {
        const m = getMaterial(e.to);
        if (!m) break;
        pool(m.category === 'paint' ? paint : ceilings, e.roomKey, e.roomName, m, e.area);
        break;
      }
      case 'furnitureAdded': {
        const m = getMaterial(furnitureMaterialId(e.modelId));
        if (!m) break;
        const factor = Math.round(e.sizeFactor * 100) / 100;
        // Pieces with your own price pool separately from estimated ones.
        const priceKey = e.price === undefined ? `x${factor}` : `own${e.price}`;
        const k = `${e.roomKey ?? ''}|${m.id}|${priceKey}`;
        const cur = furniture.get(k);
        if (cur) cur.amount += 1;
        else
          furniture.set(k, {
            roomKey: e.roomKey,
            roomName: e.roomName,
            material: m,
            amount: 1,
            factor,
            ...(e.price === undefined ? {} : { custom: e.price }),
          });
        break;
      }
    }
  }

  for (const a of paint.values()) {
    push(
      {
        roomKey: a.roomKey,
        roomName: a.roomName,
        category: 'paint',
        description: a.material.name,
        quantity: paintGallons(a.amount, 2, a.material.coverage),
        unit: 'gallon',
        basis: `${a.amount.toFixed(1)} m² × 2 coats`,
      },
      a.material,
    );
  }
  for (const a of wallFinish.values()) {
    push(
      {
        roomKey: a.roomKey,
        roomName: a.roomName,
        category: 'wallFinish',
        description: a.material.name,
        quantity: Math.ceil(a.amount * (1 + a.material.wasteFactor) * SQFT_PER_SQM - 1e-9),
        unit: 'sqft',
        basis: `${a.amount.toFixed(1)} m² of wall + ${Math.round(a.material.wasteFactor * 100)}% waste`,
      },
      a.material,
    );
  }
  for (const a of ceilings.values()) {
    push(
      {
        roomKey: a.roomKey,
        roomName: a.roomName,
        category: 'ceiling',
        description: a.material.name,
        quantity: Math.ceil(a.amount * (1 + a.material.wasteFactor) * SQFT_PER_SQM - 1e-9),
        unit: 'sqft',
        basis: `${a.amount.toFixed(1)} m² of ceiling + ${Math.round(a.material.wasteFactor * 100)}% waste`,
      },
      a.material,
    );
  }
  for (const a of drywall.values()) {
    push(
      {
        roomKey: a.roomKey,
        roomName: a.roomName,
        category: 'drywall',
        description: a.material.name,
        quantity: drywallSheets(a.amount, a.material.coverage),
        unit: 'sheet',
        basis: `${a.amount.toFixed(1)} m² of new wall + 10% waste`,
      },
      a.material,
    );
  }
  for (const a of refinish.values()) {
    push(
      {
        roomKey: a.roomKey,
        roomName: a.roomName,
        category: 'paint',
        description: a.material.name,
        quantity: a.amount,
        unit: 'each',
        basis: `${a.amount} × sand, prime & recolour`,
      },
      a.material,
    );
  }
  for (const a of counts.values()) {
    const category: CostCategory =
      a.material.category === 'door'
        ? 'doors'
        : a.material.category === 'window'
          ? 'windows'
          : 'demolition';
    push(
      {
        roomKey: a.roomKey,
        roomName: a.roomName,
        category,
        description: a.material.name,
        quantity: a.amount,
        unit: 'each',
        basis: `${a.amount} × ${a.material.name.toLowerCase()}`,
      },
      a.material,
    );
  }

  for (const a of furniture.values()) {
    if (a.custom !== undefined) {
      push(
        {
          roomKey: a.roomKey,
          roomName: a.roomName,
          category: 'furniture',
          description: `${a.material.name} (your price)`,
          quantity: a.amount,
          unit: 'each',
          basis: `${a.amount} × ${a.material.name.toLowerCase()} at the price you entered`,
          userPriced: true,
        },
        a.material,
        a.custom,
      );
      continue;
    }
    const resized = a.factor !== 1;
    push(
      {
        roomKey: a.roomKey,
        roomName: a.roomName,
        category: 'furniture',
        description: resized ? `${a.material.name} (custom size)` : a.material.name,
        quantity: a.amount,
        unit: 'each',
        basis: resized
          ? `${a.amount} × ${a.material.name.toLowerCase()} at ${Math.round(a.factor * 100)}% size`
          : `${a.amount} × ${a.material.name.toLowerCase()}`,
      },
      a.material,
      Math.round(price(a.material) * a.factor),
    );
  }

  const byRoomMap = new Map<string | null, Subtotal<string | null>>();
  const byCatMap = new Map<CostCategory, Subtotal<CostCategory>>();
  for (const l of lines) {
    const r = byRoomMap.get(l.roomKey) ?? { key: l.roomKey, label: l.roomName, total: 0 };
    r.total = round2(r.total + l.total);
    byRoomMap.set(l.roomKey, r);
    const c = byCatMap.get(l.category) ?? {
      key: l.category,
      label: CATEGORY_LABELS[l.category],
      total: 0,
    };
    c.total = round2(c.total + l.total);
    byCatMap.set(l.category, c);
  }

  return {
    lines,
    byRoom: [...byRoomMap.values()].sort((a, b) => b.total - a.total),
    byCategory: [...byCatMap.values()].sort((a, b) => b.total - a.total),
    total: round2(lines.reduce((s, l) => s + l.total, 0)),
  };
}
