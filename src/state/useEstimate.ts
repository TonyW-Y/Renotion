import { useMemo } from 'react';
import { diffPlans, type ChangeEvent } from '@/core/diff';
import { buildEstimate, type Estimate } from '@/core/estimate/costs';
import { usePlanStore } from './planStore';

export interface EstimateResult {
  events: ChangeEvent[];
  estimate: Estimate;
  /** False until "Start planning" — nothing to compare yet. */
  hasPlanned: boolean;
}

/** Live estimate: diff baseline → planned, priced with project overrides. */
export function useEstimate(): EstimateResult {
  const baseline = usePlanStore((s) => s.project.baseline);
  const planned = usePlanStore((s) => s.project.planned);
  const overrides = usePlanStore((s) => s.project.costOverrides);
  const events = useMemo(() => (planned ? diffPlans(baseline, planned) : []), [baseline, planned]);
  const estimate = useMemo(() => buildEstimate(events, overrides), [events, overrides]);
  return { events, estimate, hasPlanned: planned !== null };
}
