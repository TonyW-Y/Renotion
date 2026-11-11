/**
 * Furniture catalogue: low-poly models described as plain data (boxes,
 * cylinders and spheres), so they cost nothing to download, instance well,
 * and match the clean architectural look. A model may instead point at a
 * CC0 .glb file via `gltf`, which the 3D view loads lazily.
 *
 * Local coordinates (metres): origin at the centre of the footprint on the
 * floor; x = width, y = up, z = depth with +z the FRONT of the piece.
 */

export type FurnitureCategory = 'Living' | 'Dining' | 'Bedroom' | 'Office' | 'Kitchen' | 'Bathroom';

export type PartShape = 'box' | 'cylinder' | 'sphere';

export interface FurniturePart {
  shape: PartShape;
  /** [width, height, depth]; cylinders/spheres use width as diameter. */
  size: [number, number, number];
  /** Centre of the part. */
  position: [number, number, number];
  color: string;
}

export interface FurnitureModel {
  id: string;
  name: string;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  parts: FurniturePart[];
  /** Optional CC0 glTF model to use instead of the procedural parts. */
  gltf?: string;
}

const C = {
  fabric: '#8d97a3',
  fabricLight: '#aeb6bf',
  linen: '#cdc5b8',
  wood: '#b8875a',
  darkWood: '#5d4535',
  white: '#f2f1ed',
  offWhite: '#e3dfd7',
  black: '#2a2c30',
  metal: '#9aa1a8',
  steel: '#c9ced3',
  ceramic: '#f8f8f6',
  green: '#5b8a4c',
  pot: '#c47d5a',
  bedding: '#eceae4',
  blanket: '#7d93aa',
  rug: '#c9b89c',
  glass: '#bcd9ea',
  book1: '#b4553f',
  book2: '#3f6d8a',
  book3: '#d8b04a',
};

/** Box with its BOTTOM at y0. */
const box = (
  w: number,
  h: number,
  d: number,
  x: number,
  z: number,
  y0: number,
  color: string,
): FurniturePart => ({
  shape: 'box',
  size: [w, h, d],
  position: [x, y0 + h / 2, z],
  color,
});
const cyl = (
  dia: number,
  h: number,
  x: number,
  z: number,
  y0: number,
  color: string,
): FurniturePart => ({
  shape: 'cylinder',
  size: [dia, h, dia],
  position: [x, y0 + h / 2, z],
  color,
});
const ball = (dia: number, x: number, z: number, y0: number, color: string): FurniturePart => ({
  shape: 'sphere',
  size: [dia, dia, dia],
  position: [x, y0 + dia / 2, z],
  color,
});

/** Four legs inset from the corners of a w × d footprint. */
const legs = (
  w: number,
  d: number,
  h: number,
  inset: number,
  size: number,
  color: string,
  round = false,
) =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx = 0, sz = 0]) => {
    const x = sx * (w / 2 - inset);
    const z = sz * (d / 2 - inset);
    return round ? cyl(size, h, x, z, 0, color) : box(size, h, size, x, z, 0, color);
  });

function sofa(id: string, name: string, w: number): FurnitureModel {
  const d = 0.9;
  const seats = w > 1.8 ? 3 : 2;
  const inner = w - 0.36;
  return {
    id,
    name,
    category: 'Living',
    width: w,
    depth: d,
    height: 0.82,
    parts: [
      box(w, 0.38, d, 0, 0, 0.04, C.fabric),
      box(w, 0.42, 0.2, 0, -d / 2 + 0.1, 0.4, C.fabric),
      box(0.18, 0.22, d, -w / 2 + 0.09, 0, 0.42, C.fabric),
      box(0.18, 0.22, d, w / 2 - 0.09, 0, 0.42, C.fabric),
      ...Array.from({ length: seats }, (_, i) =>
        box(
          inner / seats - 0.03,
          0.1,
          d - 0.26,
          -inner / 2 + (inner / seats) * (i + 0.5),
          0.1,
          0.42,
          C.fabricLight,
        ),
      ),
      ...legs(w, d, 0.04, 0.08, 0.05, C.darkWood),
    ],
  };
}

function bed(id: string, name: string, w: number, l: number): FurnitureModel {
  const pillows = w > 1.2 ? 2 : 1;
  return {
    id,
    name,
    category: 'Bedroom',
    width: w,
    depth: l,
    height: 1.05,
    parts: [
      box(w, 0.3, l, 0, 0, 0.05, C.wood),
      box(w, 1.05, 0.08, 0, -l / 2 + 0.04, 0, C.darkWood),
      box(w - 0.06, 0.22, l - 0.12, 0, 0.03, 0.35, C.bedding),
      box(w - 0.04, 0.05, l * 0.62, 0, l * 0.18, 0.56, C.blanket),
      ...Array.from({ length: pillows }, (_, i) =>
        box(
          w / pillows - 0.16,
          0.12,
          0.38,
          -w / 2 + (w / pillows) * (i + 0.5),
          -l / 2 + 0.32,
          0.57,
          C.white,
        ),
      ),
      ...legs(w, l, 0.05, 0.06, 0.06, C.darkWood),
    ],
  };
}

export const FURNITURE: readonly FurnitureModel[] = [
  // ---------------- Living
  sofa('sofa', 'Sofa', 2.1),
  sofa('loveseat', 'Loveseat', 1.5),
  {
    id: 'armchair',
    name: 'Armchair',
    category: 'Living',
    width: 0.85,
    depth: 0.85,
    height: 0.8,
    parts: [
      box(0.85, 0.36, 0.85, 0, 0, 0.06, C.linen),
      box(0.85, 0.4, 0.18, 0, -0.335, 0.42, C.linen),
      box(0.14, 0.2, 0.85, -0.355, 0, 0.42, C.linen),
      box(0.14, 0.2, 0.85, 0.355, 0, 0.42, C.linen),
      box(0.55, 0.1, 0.6, 0, 0.08, 0.42, C.offWhite),
      ...legs(0.85, 0.85, 0.06, 0.08, 0.04, C.darkWood),
    ],
  },
  {
    id: 'coffee-table',
    name: 'Coffee table',
    category: 'Living',
    width: 1.1,
    depth: 0.6,
    height: 0.42,
    parts: [
      box(1.1, 0.04, 0.6, 0, 0, 0.38, C.wood),
      box(1.0, 0.02, 0.5, 0, 0, 0.12, C.wood),
      ...legs(1.1, 0.6, 0.38, 0.06, 0.04, C.darkWood, true),
    ],
  },
  {
    id: 'side-table',
    name: 'Side table',
    category: 'Living',
    width: 0.5,
    depth: 0.5,
    height: 0.55,
    parts: [
      cyl(0.5, 0.03, 0, 0, 0.52, C.wood),
      cyl(0.05, 0.5, 0, 0, 0.02, C.black),
      cyl(0.32, 0.02, 0, 0, 0, C.black),
    ],
  },
  {
    id: 'tv-stand',
    name: 'TV stand',
    category: 'Living',
    width: 1.6,
    depth: 0.42,
    height: 1.25,
    parts: [
      box(1.6, 0.45, 0.42, 0, 0, 0.05, C.darkWood),
      ...legs(1.6, 0.42, 0.05, 0.08, 0.04, C.black),
      box(1.25, 0.72, 0.05, 0, -0.08, 0.5, C.black),
      box(0.3, 0.03, 0.2, 0, -0.08, 0.5, C.black),
    ],
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    category: 'Living',
    width: 0.9,
    depth: 0.35,
    height: 1.9,
    parts: [
      box(0.03, 1.9, 0.35, -0.435, 0, 0, C.wood),
      box(0.03, 1.9, 0.35, 0.435, 0, 0, C.wood),
      box(0.9, 1.9, 0.02, 0, -0.165, 0, C.wood),
      ...[0, 0.45, 0.9, 1.35, 1.87].map((y) => box(0.84, 0.03, 0.33, 0, 0, y, C.wood)),
      ...[0.03, 0.48, 0.93, 1.38].flatMap((y, i) => [
        box(0.22, 0.3, 0.24, -0.27, 0.02, y, [C.book1, C.book2, C.book3][i % 3] ?? C.book1),
        box(0.18, 0.26, 0.24, 0.0, 0.02, y, [C.book2, C.book3, C.book1][i % 3] ?? C.book2),
        box(0.14, 0.32, 0.24, 0.24, 0.02, y, [C.book3, C.book1, C.book2][i % 3] ?? C.book3),
      ]),
    ],
  },
  {
    id: 'rug',
    name: 'Rug',
    category: 'Living',
    width: 2.0,
    depth: 1.4,
    height: 0.01,
    parts: [box(2.0, 0.012, 1.4, 0, 0, 0, C.rug), box(1.7, 0.013, 1.1, 0, 0, 0, '#bba98b')],
  },
  {
    id: 'floor-lamp',
    name: 'Floor lamp',
    category: 'Living',
    width: 0.4,
    depth: 0.4,
    height: 1.6,
    parts: [
      cyl(0.3, 0.03, 0, 0, 0, C.black),
      cyl(0.03, 1.3, 0, 0, 0.03, C.black),
      cyl(0.4, 0.3, 0, 0, 1.3, C.offWhite),
    ],
  },
  {
    id: 'plant',
    name: 'Plant',
    category: 'Living',
    width: 0.5,
    depth: 0.5,
    height: 1.1,
    parts: [
      cyl(0.34, 0.36, 0, 0, 0, C.pot),
      ball(0.5, 0, 0, 0.32, C.green),
      ball(0.36, 0.06, -0.04, 0.7, '#6f9d5c'),
    ],
  },
  // ---------------- Dining
  {
    id: 'dining-table',
    name: 'Dining table',
    category: 'Dining',
    width: 1.6,
    depth: 0.9,
    height: 0.75,
    parts: [
      box(1.6, 0.04, 0.9, 0, 0, 0.71, C.wood),
      ...legs(1.6, 0.9, 0.71, 0.07, 0.06, C.darkWood),
    ],
  },
  {
    id: 'dining-chair',
    name: 'Dining chair',
    category: 'Dining',
    width: 0.45,
    depth: 0.5,
    height: 0.9,
    parts: [
      box(0.45, 0.04, 0.45, 0, 0.025, 0.44, C.wood),
      box(0.45, 0.42, 0.03, 0, -0.235, 0.48, C.wood),
      ...legs(0.45, 0.5, 0.44, 0.03, 0.035, C.darkWood),
    ],
  },
  // ---------------- Bedroom
  bed('double-bed', 'Double bed', 1.6, 2.1),
  bed('single-bed', 'Single bed', 1.0, 2.0),
  {
    id: 'nightstand',
    name: 'Nightstand',
    category: 'Bedroom',
    width: 0.5,
    depth: 0.4,
    height: 0.55,
    parts: [
      box(0.5, 0.45, 0.4, 0, 0, 0.1, C.wood),
      box(0.44, 0.16, 0.01, 0, 0.195, 0.32, C.offWhite),
      ...legs(0.5, 0.4, 0.1, 0.04, 0.03, C.darkWood),
    ],
  },
  {
    id: 'wardrobe',
    name: 'Wardrobe',
    category: 'Bedroom',
    width: 1.2,
    depth: 0.6,
    height: 2.1,
    parts: [
      box(1.2, 2.05, 0.6, 0, 0, 0.05, C.offWhite),
      box(0.005, 1.9, 0.01, 0, 0.295, 0.12, C.metal),
      box(0.02, 0.3, 0.02, -0.05, 0.29, 1.0, C.metal),
      box(0.02, 0.3, 0.02, 0.05, 0.29, 1.0, C.metal),
    ],
  },
  {
    id: 'dresser',
    name: 'Dresser',
    category: 'Bedroom',
    width: 1.2,
    depth: 0.5,
    height: 0.85,
    parts: [
      box(1.2, 0.75, 0.5, 0, 0, 0.1, C.wood),
      ...[0.15, 0.4, 0.65].map((y) => box(1.12, 0.01, 0.01, 0, 0.245, y + 0.1, C.darkWood)),
      ...legs(1.2, 0.5, 0.1, 0.05, 0.04, C.darkWood),
    ],
  },
  // ---------------- Office
  {
    id: 'desk',
    name: 'Desk',
    category: 'Office',
    width: 1.4,
    depth: 0.7,
    height: 1.2,
    parts: [
      box(1.4, 0.035, 0.7, 0, 0, 0.72, C.white),
      ...legs(1.4, 0.7, 0.72, 0.05, 0.04, C.black),
      box(0.6, 0.36, 0.03, 0, -0.18, 0.86, C.black),
      box(0.05, 0.13, 0.05, 0, -0.2, 0.755, C.black),
    ],
  },
  {
    id: 'office-chair',
    name: 'Office chair',
    category: 'Office',
    width: 0.6,
    depth: 0.6,
    height: 1.0,
    parts: [
      cyl(0.6, 0.05, 0, 0, 0.02, C.black),
      cyl(0.05, 0.38, 0, 0, 0.07, C.metal),
      box(0.5, 0.08, 0.48, 0, 0.02, 0.45, C.black),
      box(0.46, 0.45, 0.06, 0, -0.22, 0.55, C.black),
    ],
  },
  // ---------------- Kitchen
  {
    id: 'base-cabinet',
    name: 'Kitchen counter',
    category: 'Kitchen',
    width: 0.6,
    depth: 0.6,
    height: 0.92,
    parts: [
      box(0.6, 0.8, 0.57, 0, -0.015, 0.08, C.white),
      box(0.6, 0.04, 0.6, 0, 0, 0.88, '#3b3e44'),
      box(0.58, 0.08, 0.5, 0, -0.04, 0, C.black),
    ],
  },
  {
    id: 'kitchen-island',
    name: 'Kitchen island',
    category: 'Kitchen',
    width: 1.8,
    depth: 0.9,
    height: 0.92,
    parts: [
      box(1.7, 0.8, 0.8, 0, 0, 0.08, C.white),
      box(1.8, 0.04, 0.9, 0, 0, 0.88, C.offWhite),
      box(1.68, 0.08, 0.72, 0, 0, 0, C.black),
    ],
  },
  {
    id: 'fridge',
    name: 'Fridge',
    category: 'Kitchen',
    width: 0.8,
    depth: 0.75,
    height: 1.8,
    parts: [
      box(0.8, 1.78, 0.72, 0, -0.015, 0.02, C.steel),
      box(0.79, 0.006, 0.01, 0, 0.35, 1.1, C.metal),
      box(0.03, 0.4, 0.02, 0.33, 0.36, 1.25, C.metal),
    ],
  },
  {
    id: 'stove',
    name: 'Stove',
    category: 'Kitchen',
    width: 0.76,
    depth: 0.65,
    height: 0.95,
    parts: [
      box(0.76, 0.88, 0.62, 0, 0.015, 0, C.steel),
      box(0.76, 0.03, 0.62, 0, 0.015, 0.88, C.black),
      ...[
        [-0.18, -0.13],
        [0.18, -0.13],
        [-0.18, 0.15],
        [0.18, 0.15],
      ].map(([x = 0, z = 0]) => cyl(0.18, 0.01, x, z, 0.91, '#4a4d52')),
      box(0.5, 0.28, 0.01, 0, 0.32, 0.35, C.black),
    ],
  },
  {
    id: 'sink-cabinet',
    name: 'Kitchen sink',
    category: 'Kitchen',
    width: 0.8,
    depth: 0.6,
    height: 1.15,
    parts: [
      box(0.8, 0.8, 0.57, 0, -0.015, 0.08, C.white),
      box(0.8, 0.04, 0.6, 0, 0, 0.88, '#3b3e44'),
      box(0.56, 0.015, 0.4, 0, 0.03, 0.905, C.steel),
      cyl(0.03, 0.22, 0, -0.22, 0.92, C.metal),
    ],
  },
  // ---------------- Bathroom
  {
    id: 'toilet',
    name: 'Toilet',
    category: 'Bathroom',
    width: 0.4,
    depth: 0.7,
    height: 0.8,
    parts: [
      box(0.4, 0.4, 0.18, 0, -0.26, 0.4, C.ceramic),
      cyl(0.38, 0.4, 0, 0.08, 0, C.ceramic),
      cyl(0.4, 0.03, 0, 0.08, 0.4, C.white),
    ],
  },
  {
    id: 'bathtub',
    name: 'Bathtub',
    category: 'Bathroom',
    width: 1.7,
    depth: 0.75,
    height: 0.75,
    parts: [
      box(1.7, 0.56, 0.75, 0, 0, 0, C.ceramic),
      box(1.5, 0.02, 0.55, 0, 0, 0.545, '#dbe6ec'),
      cyl(0.04, 0.18, -0.78, 0, 0.56, C.metal),
    ],
  },
  {
    id: 'vanity',
    name: 'Bathroom vanity',
    category: 'Bathroom',
    width: 0.9,
    depth: 0.5,
    height: 1.05,
    parts: [
      box(0.9, 0.62, 0.46, 0, -0.02, 0.2, C.wood),
      box(0.9, 0.04, 0.5, 0, 0, 0.82, C.white),
      cyl(0.36, 0.06, 0, 0.03, 0.86, C.ceramic),
      cyl(0.03, 0.18, 0, -0.18, 0.86, C.metal),
    ],
  },
  {
    id: 'shower',
    name: 'Shower',
    category: 'Bathroom',
    width: 0.9,
    depth: 0.9,
    height: 2.0,
    parts: [
      box(0.9, 0.06, 0.9, 0, 0, 0, C.ceramic),
      box(0.9, 1.94, 0.01, 0, 0.445, 0.06, C.glass),
      box(0.01, 1.94, 0.9, 0.445, 0, 0.06, C.glass),
      cyl(0.18, 0.02, 0, -0.32, 1.95, C.metal),
    ],
  },
];

export const FURNITURE_BY_ID: ReadonlyMap<string, FurnitureModel> = new Map(
  FURNITURE.map((m) => [m.id, m]),
);

export const FURNITURE_CATEGORIES: readonly FurnitureCategory[] = [
  'Living',
  'Dining',
  'Bedroom',
  'Office',
  'Kitchen',
  'Bathroom',
];
