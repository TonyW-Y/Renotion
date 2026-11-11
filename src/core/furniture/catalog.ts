/**
 * Furniture catalogue: low-poly models described as plain data (boxes,
 * cylinders and spheres), so they cost nothing to download, instance well,
 * and match the clean architectural look. A model may instead point at a
 * CC0 .glb file via `gltf`, which the 3D view loads lazily.
 *
 * Local coordinates (metres): origin at the centre of the footprint on the
 * floor; x = width, y = up, z = depth with +z the FRONT of the piece.
 */

export type FurnitureCategory =
  'Living' | 'Dining' | 'Bedroom' | 'Office' | 'Kitchen' | 'Bathroom' | 'Laundry';

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
  /** Rough retail price (CAD) at the catalogue size. */
  price: number;
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
  velvet: '#5f7f6b',
  slate: '#6f7782',
};

/** Colours that stay as they are when a piece is recoloured (glass, metal). */
export const NON_TINTABLE: ReadonlySet<string> = new Set([C.glass, C.metal, C.steel]);

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

function sofa(id: string, name: string, w: number, price: number): FurnitureModel {
  const d = 0.9;
  const seats = w > 1.8 ? 3 : 2;
  const inner = w - 0.36;
  return {
    id,
    name,
    category: 'Living',
    price,
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

function bed(id: string, name: string, w: number, l: number, price: number): FurnitureModel {
  const pillows = w > 1.2 ? 2 : 1;
  return {
    id,
    name,
    category: 'Bedroom',
    price,
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
  sofa('sofa', 'Sofa', 2.1, 1299),
  sofa('loveseat', 'Loveseat', 1.5, 899),
  {
    id: 'armchair',
    name: 'Armchair',
    category: 'Living',
    price: 549,
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
    price: 249,
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
    price: 99,
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
    price: 329,
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
    price: 199,
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
    price: 249,
    width: 2.0,
    depth: 1.4,
    height: 0.01,
    parts: [box(2.0, 0.012, 1.4, 0, 0, 0, C.rug), box(1.7, 0.013, 1.1, 0, 0, 0, '#bba98b')],
  },
  {
    id: 'floor-lamp',
    name: 'Floor lamp',
    category: 'Living',
    price: 129,
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
    price: 59,
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
    price: 799,
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
    price: 129,
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
  bed('double-bed', 'Double bed', 1.6, 2.1, 1199),
  bed('single-bed', 'Single bed', 1.0, 2.0, 649),
  {
    id: 'nightstand',
    name: 'Nightstand',
    category: 'Bedroom',
    price: 149,
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
    price: 899,
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
    price: 599,
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
    price: 349,
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
    price: 299,
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
    price: 650,
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
    price: 1800,
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
    price: 1899,
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
    price: 1299,
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
    price: 950,
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
    price: 399,
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
    price: 1100,
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
    price: 749,
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
    price: 1600,
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
  // ---------------- More living
  {
    id: 'sectional-sofa',
    name: 'Sectional sofa',
    category: 'Living',
    price: 2199,
    width: 2.6,
    depth: 1.6,
    height: 0.82,
    parts: [
      box(2.6, 0.38, 0.9, 0, -0.35, 0.04, C.fabric),
      box(0.9, 0.38, 0.7, 0.85, 0.45, 0.04, C.fabric),
      box(2.6, 0.42, 0.2, 0, -0.7, 0.4, C.fabric),
      box(0.18, 0.22, 0.9, -1.21, -0.35, 0.42, C.fabric),
      box(0.74, 0.1, 0.6, -0.8, -0.27, 0.42, C.fabricLight),
      box(0.74, 0.1, 0.6, -0.04, -0.27, 0.42, C.fabricLight),
      box(0.84, 0.1, 1.3, 0.85, 0.08, 0.42, C.fabricLight),
      box(0.05, 0.04, 0.05, -1.24, -0.74, 0, C.darkWood),
      box(0.05, 0.04, 0.05, 1.24, -0.74, 0, C.darkWood),
      box(0.05, 0.04, 0.05, 1.24, 0.74, 0, C.darkWood),
      box(0.05, 0.04, 0.05, -1.24, 0.04, 0, C.darkWood),
    ],
  },
  {
    id: 'ottoman',
    name: 'Ottoman',
    category: 'Living',
    price: 179,
    width: 0.6,
    depth: 0.6,
    height: 0.42,
    parts: [
      box(0.6, 0.36, 0.6, 0, 0, 0.06, C.linen),
      ...legs(0.6, 0.6, 0.06, 0.05, 0.04, C.darkWood),
    ],
  },
  {
    id: 'console-table',
    name: 'Console table',
    category: 'Living',
    price: 279,
    width: 1.2,
    depth: 0.35,
    height: 0.8,
    parts: [
      box(1.2, 0.03, 0.35, 0, 0, 0.77, C.wood),
      box(1.12, 0.02, 0.29, 0, 0, 0.2, C.wood),
      ...legs(1.2, 0.35, 0.77, 0.03, 0.03, C.black),
    ],
  },
  {
    id: 'media-unit',
    name: 'Media unit',
    category: 'Living',
    price: 549,
    width: 1.8,
    depth: 0.45,
    height: 0.55,
    parts: [
      box(1.8, 0.45, 0.45, 0, 0, 0.1, C.white),
      ...[-0.3, 0.3].map((x) => box(0.01, 0.4, 0.01, x, 0.22, 0.125, C.darkWood)),
      ...legs(1.8, 0.45, 0.1, 0.06, 0.04, C.wood),
    ],
  },
  {
    id: 'accent-chair',
    name: 'Accent chair',
    category: 'Living',
    price: 449,
    width: 0.75,
    depth: 0.8,
    height: 0.85,
    parts: [
      box(0.7, 0.12, 0.66, 0, 0.05, 0.38, C.velvet),
      box(0.7, 0.45, 0.12, 0, -0.32, 0.4, C.velvet),
      box(0.08, 0.2, 0.6, -0.335, 0.04, 0.5, C.velvet),
      box(0.08, 0.2, 0.6, 0.335, 0.04, 0.5, C.velvet),
      ...legs(0.7, 0.7, 0.38, 0.06, 0.035, C.wood, true),
    ],
  },
  // ---------------- More dining
  {
    id: 'round-table',
    name: 'Round table',
    category: 'Dining',
    price: 699,
    width: 1.1,
    depth: 1.1,
    height: 0.75,
    parts: [
      cyl(1.1, 0.04, 0, 0, 0.71, C.wood),
      cyl(0.12, 0.65, 0, 0, 0.06, C.darkWood),
      cyl(0.6, 0.06, 0, 0, 0, C.darkWood),
    ],
  },
  {
    id: 'bar-stool',
    name: 'Bar stool',
    category: 'Dining',
    price: 119,
    width: 0.42,
    depth: 0.42,
    height: 0.78,
    parts: [
      cyl(0.4, 0.06, 0, 0, 0.72, C.black),
      cyl(0.05, 0.66, 0, 0, 0.06, C.metal),
      cyl(0.34, 0.02, 0, 0, 0.3, C.metal),
      cyl(0.42, 0.03, 0, 0, 0, C.metal),
    ],
  },
  {
    id: 'sideboard',
    name: 'Sideboard',
    category: 'Dining',
    price: 699,
    width: 1.6,
    depth: 0.45,
    height: 0.8,
    parts: [
      box(1.6, 0.68, 0.45, 0, 0, 0.12, C.darkWood),
      ...[-0.4, 0, 0.4].map((x) => box(0.01, 0.6, 0.01, x, 0.22, 0.16, C.wood)),
      ...legs(1.6, 0.45, 0.12, 0.06, 0.04, C.black),
    ],
  },
  {
    id: 'dining-bench',
    name: 'Dining bench',
    category: 'Dining',
    price: 199,
    width: 1.4,
    depth: 0.38,
    height: 0.46,
    parts: [
      box(1.4, 0.05, 0.38, 0, 0, 0.41, C.wood),
      ...legs(1.4, 0.38, 0.41, 0.06, 0.05, C.darkWood),
    ],
  },
  // ---------------- More bedroom
  {
    id: 'crib',
    name: 'Crib',
    category: 'Bedroom',
    price: 349,
    width: 1.3,
    depth: 0.7,
    height: 0.95,
    parts: [
      box(1.22, 0.15, 0.66, 0, 0, 0.3, C.white),
      box(1.18, 0.12, 0.6, 0, 0, 0.45, C.bedding),
      box(0.04, 0.95, 0.7, -0.63, 0, 0, C.white),
      box(0.04, 0.95, 0.7, 0.63, 0, 0, C.white),
      box(1.22, 0.04, 0.04, 0, -0.33, 0.88, C.white),
      box(1.22, 0.04, 0.04, 0, 0.33, 0.88, C.white),
      ...[-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45].flatMap((x) => [
        box(0.02, 0.43, 0.02, x, -0.33, 0.45, C.white),
        box(0.02, 0.43, 0.02, x, 0.33, 0.45, C.white),
      ]),
    ],
  },
  {
    id: 'dressing-table',
    name: 'Dressing table',
    category: 'Bedroom',
    price: 399,
    width: 1.0,
    depth: 0.45,
    height: 1.47,
    parts: [
      box(1.0, 0.04, 0.45, 0, 0, 0.72, C.white),
      box(0.3, 0.16, 0.41, -0.33, 0.01, 0.55, C.white),
      box(0.3, 0.16, 0.41, 0.33, 0.01, 0.55, C.white),
      ...legs(1.0, 0.45, 0.72, 0.04, 0.04, C.wood),
      box(0.66, 0.74, 0.03, 0, -0.2, 0.76, C.wood),
      box(0.6, 0.68, 0.01, 0, -0.18, 0.79, C.glass),
    ],
  },
  {
    id: 'bed-bench',
    name: 'End-of-bed bench',
    category: 'Bedroom',
    price: 249,
    width: 1.3,
    depth: 0.4,
    height: 0.45,
    parts: [
      box(1.3, 0.04, 0.4, 0, 0, 0.27, C.darkWood),
      box(1.26, 0.14, 0.38, 0, 0, 0.31, C.linen),
      ...legs(1.3, 0.4, 0.27, 0.05, 0.04, C.darkWood),
    ],
  },
  {
    id: 'chest-of-drawers',
    name: 'Chest of drawers',
    category: 'Bedroom',
    price: 449,
    width: 0.8,
    depth: 0.45,
    height: 1.2,
    parts: [
      box(0.8, 1.1, 0.45, 0, 0, 0.1, C.offWhite),
      ...[0.36, 0.62, 0.88].map((y) => box(0.74, 0.01, 0.01, 0, 0.22, y, C.darkWood)),
      ...legs(0.8, 0.45, 0.1, 0.04, 0.04, C.wood),
    ],
  },
  // ---------------- More office
  {
    id: 'standing-desk',
    name: 'Standing desk',
    category: 'Office',
    price: 599,
    width: 1.4,
    depth: 0.7,
    height: 1.1,
    parts: [
      box(1.4, 0.03, 0.7, 0, 0, 1.05, C.wood),
      box(0.07, 1.05, 0.07, -0.6, 0, 0, C.black),
      box(0.07, 1.05, 0.07, 0.6, 0, 0, C.black),
      box(0.07, 0.04, 0.7, -0.6, 0, 0, C.black),
      box(0.07, 0.04, 0.7, 0.6, 0, 0, C.black),
      box(0.34, 0.015, 0.24, 0, 0.05, 1.08, C.metal),
    ],
  },
  {
    id: 'filing-cabinet',
    name: 'Filing cabinet',
    category: 'Office',
    price: 229,
    width: 0.45,
    depth: 0.6,
    height: 1.0,
    parts: [
      box(0.45, 1.0, 0.6, 0, 0, 0, C.slate),
      ...[0.25, 0.58, 0.9].map((y) => box(0.14, 0.02, 0.02, 0, 0.29, y, C.metal)),
    ],
  },
  {
    id: 'tall-bookcase',
    name: 'Tall bookcase',
    category: 'Office',
    price: 329,
    width: 0.9,
    depth: 0.35,
    height: 2.0,
    parts: [
      box(0.03, 2.0, 0.35, -0.435, 0, 0, C.white),
      box(0.03, 2.0, 0.35, 0.435, 0, 0, C.white),
      box(0.84, 2.0, 0.02, 0, -0.165, 0, C.white),
      ...[0, 0.4, 0.8, 1.2, 1.6, 1.975].map((y) => box(0.84, 0.025, 0.33, 0, 0.01, y, C.white)),
      box(0.3, 0.26, 0.24, -0.2, 0, 0.425, C.book1),
      box(0.22, 0.3, 0.24, 0.18, 0, 0.825, C.book2),
      box(0.34, 0.24, 0.24, -0.1, 0, 1.225, C.book3),
      box(0.18, 0.28, 0.24, 0.25, 0, 1.625, C.book1),
    ],
  },
  // ---------------- More kitchen
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    category: 'Kitchen',
    price: 899,
    width: 0.6,
    depth: 0.6,
    height: 0.86,
    parts: [
      box(0.6, 0.86, 0.6, 0, 0, 0, C.steel),
      box(0.58, 0.1, 0.01, 0, 0.295, 0.74, C.black),
      box(0.45, 0.02, 0.03, 0, 0.285, 0.7, C.black),
    ],
  },
  {
    id: 'pantry-cabinet',
    name: 'Pantry cabinet',
    category: 'Kitchen',
    price: 799,
    width: 0.6,
    depth: 0.6,
    height: 2.1,
    parts: [
      box(0.6, 2.1, 0.6, 0, 0, 0, C.white),
      box(0.56, 0.01, 0.01, 0, 0.295, 1.4, C.darkWood),
      box(0.02, 0.3, 0.02, 0.22, 0.29, 1.0, C.metal),
      box(0.02, 0.3, 0.02, 0.22, 0.29, 1.5, C.metal),
    ],
  },
  // ---------------- More bathroom
  {
    id: 'double-vanity',
    name: 'Double vanity',
    category: 'Bathroom',
    price: 1499,
    width: 1.5,
    depth: 0.55,
    height: 1.0,
    parts: [
      box(1.4, 0.12, 0.5, 0, -0.02, 0, C.darkWood),
      box(1.5, 0.7, 0.55, 0, 0, 0.12, C.wood),
      box(1.5, 0.04, 0.55, 0, 0, 0.82, C.ceramic),
      cyl(0.4, 0.02, -0.38, 0.03, 0.86, C.ceramic),
      cyl(0.4, 0.02, 0.38, 0.03, 0.86, C.ceramic),
      cyl(0.03, 0.14, -0.38, -0.2, 0.86, C.metal),
      cyl(0.03, 0.14, 0.38, -0.2, 0.86, C.metal),
    ],
  },
  {
    id: 'towel-cabinet',
    name: 'Towel cabinet',
    category: 'Bathroom',
    price: 259,
    width: 0.4,
    depth: 0.3,
    height: 1.6,
    parts: [
      box(0.4, 1.6, 0.3, 0, 0, 0, C.white),
      box(0.36, 0.01, 0.01, 0, 0.145, 0.9, C.darkWood),
      box(0.02, 0.18, 0.02, 0.15, 0.14, 1.05, C.metal),
    ],
  },
  // ---------------- Laundry
  {
    id: 'washer',
    name: 'Washer',
    category: 'Laundry',
    price: 999,
    width: 0.6,
    depth: 0.6,
    height: 0.85,
    parts: [
      box(0.6, 0.85, 0.6, 0, 0, 0, C.white),
      box(0.58, 0.1, 0.01, 0, 0.295, 0.72, C.offWhite),
      box(0.44, 0.44, 0.02, 0, 0.29, 0.2, C.glass),
      cyl(0.06, 0.02, 0.18, 0.26, 0.83, C.black),
    ],
  },
  {
    id: 'dryer',
    name: 'Dryer',
    category: 'Laundry',
    price: 899,
    width: 0.6,
    depth: 0.6,
    height: 0.85,
    parts: [
      box(0.6, 0.85, 0.6, 0, 0, 0, C.white),
      box(0.58, 0.1, 0.01, 0, 0.295, 0.72, C.offWhite),
      box(0.44, 0.44, 0.02, 0, 0.29, 0.2, C.black),
      cyl(0.06, 0.02, 0.18, 0.26, 0.83, C.black),
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
  'Laundry',
];
