import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildYear,
  costOfChange,
  findBreaks,
  formatRange,
  leaveUsed,
  nextValue,
} from './calendar';

describe('calendar', () => {
  it('builds 12 months with the right number of days and starting weekday', () => {
    const months = buildYear(2026);
    expect(months).toHaveLength(12);
    expect(months[1].days).toHaveLength(28);
    expect(months[0].leadingBlanks).toBe(4); // 1 Jan 2026 is a Thursday
    expect(buildYear(2027)[0].leadingBlanks).toBe(5); // 1 Jan 2027 is a Friday
  });

  it('marks weekends, holidays and suggestions', () => {
    const jan = buildYear(2026)[0].days;
    expect(jan[0].holiday?.name).toBe("New Year's Day");
    expect(jan[1].suggested).toBe(true);
    expect(jan[2].isWeekend).toBe(true);
  });

  it('cycles leave: empty, full, half, empty', () => {
    expect(nextValue(undefined, 'leave')).toBe(1);
    expect(nextValue(1, 'leave')).toBe(0.5);
    expect(nextValue(0.5, 'leave')).toBeNull();
    expect(nextValue(-1, 'leave')).toBe(1);
  });

  it('toggles blocked days', () => {
    expect(nextValue(undefined, 'block')).toBe(-1);
    expect(nextValue(1, 'block')).toBe(-1);
    expect(nextValue(-1, 'block')).toBeNull();
  });

  it('counts leave per year, ignoring blocked days', () => {
    const leaves = {
      '2026-01-02': 1,
      '2026-01-05': 0.5,
      '2026-01-06': -1,
      '2027-02-09': 1,
    } as const;
    expect(leaveUsed(leaves, 2026)).toBe(1.5);
    expect(leaveUsed(leaves, 2027)).toBe(1);
  });

  it('works out how a change affects the balance', () => {
    expect(costOfChange(undefined, 1)).toBe(1);
    expect(costOfChange(1, 0.5)).toBe(-0.5);
    expect(costOfChange(0.5, -1)).toBe(-0.5);
    expect(costOfChange(-1, null)).toBe(0);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds breaks including weekends and public holidays', () => {
    // Hari Raya Haji 2026 (Wed 27 May) + 4 days leave + Vesak (Sun 31 May) + in-lieu (Mon 1 Jun)
    const leaves = { '2026-05-25': 1, '2026-05-26': 1, '2026-05-28': 1, '2026-05-29': 1 } as const;
    expect(findBreaks(leaves, 2026)).toEqual([
      { start: '2026-05-23', end: '2026-06-01', totalDays: 10, leaveUsed: 4 },
    ]);
  });

  it('keeps separate breaks apart and ignores half days for joining', () => {
    const leaves = { '2026-01-02': 1, '2026-01-07': 0.5, '2026-01-09': 1 } as const;
    const breaks = findBreaks(leaves, 2026);
    expect(breaks.map((b) => [b.start, b.end, b.totalDays])).toEqual([
      ['2026-01-01', '2026-01-04', 4],
      ['2026-01-09', '2026-01-11', 3],
    ]);
  });

  it('formats date ranges in plain words', () => {
    expect(formatRange('2026-05-28', '2026-05-28')).toBe('28 May');
    expect(formatRange('2026-05-23', '2026-05-31')).toBe('23 to 31 May');
    expect(formatRange('2026-12-26', '2027-01-03')).toBe('26 Dec to 3 Jan');
  });
});
