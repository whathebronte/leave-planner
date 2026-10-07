import { describe, expect, it } from 'vitest';
import { isPlannerId, parsePlannerId } from './planner-store.service';

describe('planner links', () => {
  it('reads the ID from a full link', () => {
    expect(
      parsePlannerId('https://danilpalma.com/leave-planner-2026/?uid=lrBl2AyjsZar8oVsBXDbl9EeBXW2'),
    ).toBe('lrBl2AyjsZar8oVsBXDbl9EeBXW2');
  });

  it('rejects the 8-character short ID the old app displayed', () => {
    expect(isPlannerId('lrBl2Ayj')).toBe(false);
    expect(isPlannerId('lrBl2AyjsZar8oVsBXDbl9EeBXW2')).toBe(true);
  });

  it('ignores links without an ID', () => {
    expect(parsePlannerId('https://danilpalma.com/leave-planner-2026/')).toBeNull();
    expect(parsePlannerId('not a link')).toBeNull();
  });
});
