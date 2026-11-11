import type { TaskPhase } from '@/core/tasks/templates';

/** One hue per trade phase (works on light and dark surfaces). */
export const PHASE_COLORS: Record<TaskPhase, string> = {
  consult: '#8b7cf6',
  demolition: '#ef6b5b',
  framing: '#e5a23c',
  drywall: '#8c9bab',
  prep: '#3fb5a8',
  paint: '#d973a6',
  flooring: '#b8875a',
  finish: '#4f9d69',
  furnish: '#4f8cff',
};
