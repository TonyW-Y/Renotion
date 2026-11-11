import type { ChangeEvent } from '../diff';
import type { Material, MaterialUnit } from '../types';
import { getMaterial } from './defaultCosts';
import {
  baseboardMetres,
  drywallSheets,
  flooringQuantity,
  paintGallons,
  toLinearFeet,
} from './quantities';

export type CostCategory =
  'flooring' | 'tile' | 'paint' | 'trim' | 'drywall' | 'doors' | 'windows' | 'demolition';

export const CATEGORY_LABELS: Record<CostCategory, string> = {
  flooring: 'Flooring',
  tile: 'Tile',
  paint: 'Paint',
  trim: 'Trim',
  drywall: 'Drywall',
  doors: 'Doors',
  windows: 'Windows',
  demolition: 'Demolition',
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
    >,
    m: Material,
  ) => {
    if (a.quantity <= 0) return;
    const unitCost = price(m);
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
        const m = getMaterial(e.to);
        if (!m) break;
        for (const s of e.shares) pool(paint, s.roomKey, s.roomName, m, s.area);
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
        const m = getMaterial(e.kind === 'door' ? DOOR_MATERIAL : WINDOW_MATERIAL);
        if (m) pool(counts, e.roomKey, e.roomName, m, 1);
        break;
      }
      case 'openingRemoved':
        break;
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
