import { useMemo } from 'react';
import { detectRooms } from '@/core/geometry/roomDetection';
import { endpointJoins, type EndpointJoins } from '@/core/geometry/wallGraph';
import { resolveRooms, type ResolvedRoom } from '@/core/rooms';
import type { ID, Plan } from '@/core/types';

export interface DerivedPlan {
  rooms: ResolvedRoom[];
  joins: Map<ID, EndpointJoins>;
}

/** Everything computed from the plan's walls (memoized on walls / room metadata). */
export function derivePlan(plan: Plan): DerivedPlan {
  return {
    rooms: resolveRooms(detectRooms(plan.walls), plan.rooms),
    joins: endpointJoins(plan.walls),
  };
}

export function useDerivedPlan(plan: Plan): DerivedPlan {
  const { walls, rooms } = plan;
  return useMemo(
    () => ({ rooms: resolveRooms(detectRooms(walls), rooms), joins: endpointJoins(walls) }),
    [walls, rooms],
  );
}
