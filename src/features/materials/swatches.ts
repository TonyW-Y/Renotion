import { PAINTS } from '@/core/estimate/defaultCosts';

/** The paint palette as plain colours, shared by every colour control. */
export const SWATCHES: readonly { name: string; hex: string }[] = PAINTS.flatMap((m) =>
  m.colorHex ? [{ name: m.name, hex: m.colorHex }] : [],
);
