/**
 * Data shapes for the leave planner.
 *
 * Firestore layout:
 *   planners/{plannerId}  -> PlannerDoc (one planner, the thing your link points to)
 *   users/{googleUid}     -> UserDoc    (remembers which planner belongs to a Google account)
 */

/** A date written as text, e.g. "2026-05-28". */
export type DateKey = string;

/**
 * What is booked on a single day.
 *   1   = full day of leave
 *   0.5 = half day of leave
 *  -1   = blocked (a work day you cannot take off)
 * Days with nothing booked are simply absent.
 */
export type DayValue = 1 | 0.5 | -1;

/** The "brush" selected in the bottom bar. */
export type Mode = 'leave' | 'block';

/** Exactly what is stored in Firestore for one planner. */
export interface PlannerDoc {
  schemaVersion: 2;
  /** Google account that owns this planner, or null if anyone with the link can open it. */
  ownerUid: string | null;
  /** Leave allowance per year, e.g. { "2026": 21, "2027": 18 }. */
  totals: Record<string, number>;
  /** Every booked day across all years. */
  leaves: Record<DateKey, DayValue>;
}

/** Planner as used inside the app (already cleaned up). */
export interface Planner {
  id: string;
  ownerUid: string | null;
  totals: Record<string, number>;
  leaves: Record<DateKey, DayValue>;
}

export interface UserDoc {
  plannerId: string;
}

export const DEFAULT_ALLOWANCE = 21;
export const PLANNERS = 'planners';
export const USERS = 'users';

/**
 * Turns whatever is in Firestore into a clean Planner.
 * Handles planners saved by the old app: they had a single `total` number
 * (which was for 2026) and sometimes used 0 to mean "blocked".
 */
export function plannerFromFirestore(id: string, raw: Record<string, unknown>): Planner {
  const totals: Record<string, number> = {};
  if (isRecord(raw['totals'])) {
    for (const [year, value] of Object.entries(raw['totals'])) {
      if (typeof value === 'number' && value >= 0) totals[year] = value;
    }
  }
  if (totals['2026'] === undefined && typeof raw['total'] === 'number' && raw['total'] >= 0) {
    totals['2026'] = raw['total'];
  }

  const leaves: Record<DateKey, DayValue> = {};
  if (isRecord(raw['leaves'])) {
    for (const [key, value] of Object.entries(raw['leaves'])) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      if (value === 1 || value === 0.5 || value === -1) leaves[key] = value;
      else if (value === 0) leaves[key] = -1; // old app's "blocked"
    }
  }

  const owner = raw['ownerUid'];
  return { id, ownerUid: typeof owner === 'string' ? owner : null, totals, leaves };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
