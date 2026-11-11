export interface SnapshotPalette {
  wall: string;
  room: string;
  gap: string;
}

/** Follows the current theme. */
export const THEME_PALETTE: SnapshotPalette = {
  wall: 'var(--wall)',
  room: 'var(--room)',
  gap: 'var(--canvas)',
};
/** Fixed colours for paper. */
export const PRINT_PALETTE: SnapshotPalette = { wall: '#253041', room: '#e8eefc', gap: '#ffffff' };
