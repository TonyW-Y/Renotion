import type { DoorStyle, Opening, OpeningStyle, OpeningType, WindowStyle } from './types';

export interface StyleInfo<S extends OpeningStyle> {
  id: S;
  name: string;
  /** Material id used to price a new unit of this design. */
  materialId: string;
}

export const DOOR_STYLES: readonly StyleInfo<DoorStyle>[] = [
  { id: 'slab', name: 'Flat slab', materialId: 'interior-door' },
  { id: 'panel', name: 'Four panel', materialId: 'door-panel' },
  { id: 'glass', name: 'Glass', materialId: 'door-glass' },
  { id: 'barn', name: 'Sliding barn', materialId: 'door-barn' },
  { id: 'double', name: 'French', materialId: 'door-double' },
  { id: 'pet', name: 'Pet door', materialId: 'door-pet' },
];

export const WINDOW_STYLES: readonly StyleInfo<WindowStyle>[] = [
  { id: 'casement', name: 'Casement', materialId: 'window-unit' },
  { id: 'double-hung', name: 'Double hung', materialId: 'window-double-hung' },
  { id: 'slider', name: 'Slider', materialId: 'window-slider' },
  { id: 'picture', name: 'Picture', materialId: 'window-picture' },
  { id: 'grid', name: 'Colonial grid', materialId: 'window-grid' },
  { id: 'bay', name: 'Deep sill', materialId: 'window-bay' },
];

export function stylesFor(type: 'door'): readonly StyleInfo<DoorStyle>[];
export function stylesFor(type: 'window'): readonly StyleInfo<WindowStyle>[];
export function stylesFor(type: OpeningType): readonly StyleInfo<OpeningStyle>[];
export function stylesFor(type: OpeningType): readonly StyleInfo<OpeningStyle>[] {
  return type === 'door' ? DOOR_STYLES : WINDOW_STYLES;
}

const DEFAULT_DOOR: StyleInfo<DoorStyle> = {
  id: 'slab',
  name: 'Flat slab',
  materialId: 'interior-door',
};
const DEFAULT_WINDOW: StyleInfo<WindowStyle> = {
  id: 'casement',
  name: 'Casement',
  materialId: 'window-unit',
};

/** Full info for the opening's design, falling back to the type's default. */
export function openingStyleInfo(o: Pick<Opening, 'type' | 'style'>): StyleInfo<OpeningStyle> {
  const found = stylesFor(o.type).find((s) => s.id === o.style);
  return found ?? (o.type === 'door' ? DEFAULT_DOOR : DEFAULT_WINDOW);
}

/** The opening's design id, falling back to the type's default. */
export const openingStyleOf = (o: Pick<Opening, 'type' | 'style'>): OpeningStyle =>
  openingStyleInfo(o).id;

export const openingMaterialId = (o: Pick<Opening, 'type' | 'style'>): string =>
  openingStyleInfo(o).materialId;

export interface OpeningPreset {
  name: string;
  width: number;
  height: number;
  /** Windows only. */
  sillHeight?: number;
  /** Switches to this design too. */
  style?: OpeningStyle;
}

/** Common sizes, one click away in the inspector. */
export const OPENING_PRESETS: Record<OpeningType, readonly OpeningPreset[]> = {
  door: [
    { name: 'Standard', width: 0.9, height: 2.03 },
    { name: 'Wide', width: 1.07, height: 2.03 },
    { name: 'Double', width: 1.52, height: 2.03, style: 'double' },
    { name: 'Pet', width: 0.3, height: 0.4, style: 'pet' },
  ],
  window: [
    { name: 'Small', width: 0.6, height: 0.6, sillHeight: 1.2 },
    { name: 'Standard', width: 1.2, height: 1.2, sillHeight: 0.9 },
    { name: 'Large', width: 1.8, height: 1.4, sillHeight: 0.6 },
    { name: 'Tall', width: 0.9, height: 1.8, sillHeight: 0.4 },
  ],
};

/** Smallest opening the editor allows (a small pet door). */
export const MIN_OPENING_SIZE = 0.2;
