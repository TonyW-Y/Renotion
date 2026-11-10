import { BrickWall, DoorOpen, Eraser, Grid2x2, MousePointer2, type LucideIcon } from 'lucide-react';
import type { Tool, ViewMode } from '@/state/uiStore';

export interface ToolDef {
  id: Tool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  hint: string;
}

export const TOOLS: readonly ToolDef[] = [
  {
    id: 'select',
    label: 'Select',
    shortcut: 'V',
    icon: MousePointer2,
    hint: 'Click to select · drag to move',
  },
  {
    id: 'wall',
    label: 'Wall',
    shortcut: 'W',
    icon: BrickWall,
    hint: 'Click to place corners · Esc to finish · Shift frees angle',
  },
  {
    id: 'door',
    label: 'Door',
    shortcut: 'D',
    icon: DoorOpen,
    hint: 'Click a wall to place a door',
  },
  {
    id: 'window',
    label: 'Window',
    shortcut: 'N',
    icon: Grid2x2,
    hint: 'Click a wall to place a window',
  },
  {
    id: 'delete',
    label: 'Delete',
    shortcut: 'X',
    icon: Eraser,
    hint: 'Click any element to delete it',
  },
];

export const VIEW_SHORTCUTS: Record<string, ViewMode> = { '1': '2d', '2': 'split', '3': '3d' };

export function toolByShortcut(key: string): ToolDef | undefined {
  const k = key.toUpperCase();
  return TOOLS.find((t) => t.shortcut === k);
}
