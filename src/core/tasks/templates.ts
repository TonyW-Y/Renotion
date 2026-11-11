import type { ChangeType } from '../diff';

/**
 * Trade phases, in the order work generally happens on site. Cross-room
 * ordering rules in `generate.ts` are expressed in terms of these.
 */
export type TaskPhase =
  | 'consult'
  | 'demolition'
  | 'framing'
  | 'drywall'
  | 'prep'
  | 'paint'
  | 'flooring'
  | 'finish'
  | 'furnish';

export const PHASE_ORDER: readonly TaskPhase[] = [
  'consult',
  'demolition',
  'framing',
  'drywall',
  'prep',
  'paint',
  'flooring',
  'finish',
  'furnish',
];

export const PHASE_LABELS: Record<TaskPhase, string> = {
  consult: 'Consult',
  demolition: 'Demolition',
  framing: 'Framing',
  drywall: 'Drywall',
  prep: 'Prep',
  paint: 'Paint',
  flooring: 'Flooring',
  finish: 'Finishing',
  furnish: 'Furnishing',
};

export interface TaskTemplate {
  /** Stable id within the chain, e.g. 'remove'. */
  step: string;
  title: string;
  phase: TaskPhase;
  /** Days, or a function of the work quantity (m² or count). */
  duration: number | ((qty: number) => number);
}

/** Rounds up to the nearest half day, minimum half a day. */
export const halfDays = (d: number): number => Math.max(0.5, Math.ceil(d * 2) / 2);

/**
 * Each change type maps to an ordered chain of tasks (each step depends on
 * the previous one). Durations are rough single-crew estimates.
 */
export const TEMPLATES: Record<
  | Exclude<ChangeType, 'wallPainted' | 'furnitureAdded'>
  | 'roomPainted'
  | 'roomFurnished'
  | 'roomWallFinished',
  readonly TaskTemplate[]
> = {
  floorChanged: [
    {
      step: 'remove',
      title: 'Remove old flooring',
      phase: 'demolition',
      duration: (m2) => halfDays(m2 / 25),
    },
    {
      step: 'prep',
      title: 'Prep & level subfloor',
      phase: 'prep',
      duration: (m2) => halfDays(m2 / 30),
    },
    {
      step: 'install',
      title: 'Install new flooring',
      phase: 'flooring',
      duration: (m2) => halfDays(m2 / 15),
    },
    { step: 'baseboard', title: 'Install baseboard', phase: 'finish', duration: 0.5 },
  ],
  roomPainted: [
    { step: 'patch', title: 'Patch & sand walls', phase: 'prep', duration: 0.5 },
    { step: 'prime', title: 'Prime', phase: 'paint', duration: (m2) => halfDays(m2 / 60) },
    {
      step: 'paint',
      title: 'Paint (2 coats)',
      phase: 'paint',
      duration: (m2) => halfDays(m2 / 30),
    },
  ],
  wallRemoved: [
    {
      step: 'consult',
      title: 'Confirm wall is non-load-bearing (consult a professional)',
      phase: 'consult',
      duration: 1,
    },
    { step: 'demo', title: 'Demolish wall', phase: 'demolition', duration: 1 },
    { step: 'patch', title: 'Patch floor & ceiling', phase: 'drywall', duration: 1 },
    { step: 'paint', title: 'Paint patched areas', phase: 'paint', duration: 0.5 },
  ],
  wallAdded: [
    { step: 'frame', title: 'Frame new wall', phase: 'framing', duration: 1 },
    { step: 'board', title: 'Hang drywall', phase: 'drywall', duration: 1 },
    { step: 'mud', title: 'Tape & mud drywall', phase: 'drywall', duration: 1.5 },
  ],
  openingAdded: [
    { step: 'cut', title: 'Cut opening & install header', phase: 'framing', duration: 1 },
    { step: 'install', title: 'Install unit', phase: 'finish', duration: 0.5 },
    { step: 'trim', title: 'Trim & caulk', phase: 'finish', duration: 0.5 },
  ],
  openingRefinished: [
    { step: 'refinish', title: 'Sand & refinish', phase: 'paint', duration: 0.5 },
  ],
  roomWallFinished: [
    { step: 'prep', title: 'Prep walls for new finish', phase: 'prep', duration: 0.5 },
    {
      step: 'install',
      title: 'Install wall finish',
      phase: 'paint',
      duration: (m2) => halfDays(m2 / 8),
    },
  ],
  ceilingChanged: [
    { step: 'prep', title: 'Prep ceiling', phase: 'prep', duration: 0.5 },
    {
      step: 'finish',
      title: 'Finish ceiling',
      phase: 'paint',
      duration: (m2) => halfDays(m2 / 20),
    },
  ],
  roomFurnished: [
    {
      step: 'deliver',
      title: 'Deliver & set up furniture',
      phase: 'furnish',
      duration: (pieces) => halfDays(pieces * 0.15),
    },
  ],
  openingRemoved: [
    { step: 'infill', title: 'Frame in old opening', phase: 'framing', duration: 0.5 },
    { step: 'patch', title: 'Drywall patch', phase: 'drywall', duration: 1 },
  ],
};
