import { describe, expect, it } from 'vitest';
import { plannerFromFirestore } from './planner.model';

describe('plannerFromFirestore', () => {
  it('reads planners saved by the old app', () => {
    const p = plannerFromFirestore('abc', {
      total: 18,
      updated: '2026-01-01',
      leaves: { '2026-01-02': 1, '2026-01-05': 0.5, '2026-01-06': 0, '2026-01-07': -1 },
    });
    expect(p.totals).toEqual({ '2026': 18 });
    expect(p.leaves).toEqual({
      '2026-01-02': 1,
      '2026-01-05': 0.5,
      '2026-01-06': -1,
      '2026-01-07': -1,
    });
    expect(p.ownerUid).toBeNull();
  });

  it('keeps a leave allowance of 0 (the old app reset it to 21)', () => {
    expect(plannerFromFirestore('abc', { total: 0, leaves: {} }).totals).toEqual({ '2026': 0 });
  });

  it('reads the new format and drops anything invalid', () => {
    const p = plannerFromFirestore('abc', {
      schemaVersion: 2,
      ownerUid: 'u1',
      totals: { '2026': 21, '2027': 'lots' },
      leaves: { '2027-02-09': 1, 'not-a-date': 1, '2027-02-10': 7 },
    });
    expect(p.totals).toEqual({ '2026': 21 });
    expect(p.leaves).toEqual({ '2027-02-09': 1 });
    expect(p.ownerUid).toBe('u1');
  });

  it('copes with an empty document', () => {
    expect(plannerFromFirestore('abc', {})).toEqual({
      id: 'abc',
      ownerUid: null,
      totals: {},
      leaves: {},
    });
  });
});
