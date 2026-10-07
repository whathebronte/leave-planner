/**
 * Pure calendar maths: no Firebase, no screen code. Everything here is unit tested.
 */
import { YEARS, holidayFor, Holiday } from '../data/holidays';
import { DateKey, DayValue, Mode } from '../models/planner.model';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface CalendarDay {
  key: DateKey;
  day: number;
  isWeekend: boolean;
  holiday: Holiday | undefined;
  suggested: boolean;
}

export interface CalendarMonth {
  index: number;
  name: string;
  /** Empty slots before day 1 so the 1st lands under the right weekday (Sunday first). */
  leadingBlanks: number;
  days: CalendarDay[];
}

/** A stretch of consecutive days off that includes at least one day of leave. */
export interface Break {
  start: DateKey;
  end: DateKey;
  totalDays: number;
  leaveUsed: number;
}

export function toKey(year: number, monthIndex: number, day: number): DateKey {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Works in UTC so a phone's time zone can never shift a date by one day. */
export function keyToDate(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function isWeekend(key: DateKey): boolean {
  const dow = keyToDate(key).getUTCDay();
  return dow === 0 || dow === 6;
}

export function buildYear(year: number): CalendarMonth[] {
  const suggestions = new Set(YEARS[year]?.suggestions ?? []);
  return MONTH_NAMES.map((name, index) => {
    const daysInMonth = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
    const days: CalendarDay[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const key = toKey(year, index, day);
      days.push({
        key,
        day,
        isWeekend: isWeekend(key),
        holiday: holidayFor(key),
        suggested: suggestions.has(key),
      });
    }
    return { index, name, leadingBlanks: new Date(Date.UTC(year, index, 1)).getUTCDay(), days };
  });
}

/** Days of leave used in a given year (blocked days cost nothing). */
export function leaveUsed(leaves: Record<DateKey, DayValue>, year: number): number {
  const prefix = `${year}-`;
  let used = 0;
  for (const [key, value] of Object.entries(leaves)) {
    if (key.startsWith(prefix) && value > 0) used += value;
  }
  return used;
}

/**
 * What a tap does.
 * Leave brush: empty -> full -> half -> empty (a blocked day becomes full).
 * Block brush: anything -> blocked, blocked -> empty.
 * Returns null for "nothing booked".
 */
export function nextValue(current: DayValue | undefined, mode: Mode): DayValue | null {
  if (mode === 'block') return current === -1 ? null : -1;
  if (current === 1) return 0.5;
  if (current === 0.5) return null;
  return 1;
}

/** Change in leave balance if a day goes from `from` to `to`. */
export function costOfChange(from: DayValue | undefined, to: DayValue | null): number {
  const value = (v: DayValue | undefined | null) => (v && v > 0 ? v : 0);
  return value(to) - value(from);
}

/**
 * Finds every break (weekends + public holidays + leave in a row) that uses
 * at least one day of leave in the given year. Half days count as leave used
 * but do not make the day fully off, so they do not join days together.
 */
export function findBreaks(leaves: Record<DateKey, DayValue>, year: number): Break[] {
  const isOff = (key: DateKey) =>
    isWeekend(key) || holidayFor(key) !== undefined || leaves[key] === 1;
  const leaveDays = Object.keys(leaves)
    .filter((k) => k.startsWith(`${year}-`) && leaves[k] === 1)
    .sort();

  const breaks: Break[] = [];
  const seen = new Set<DateKey>();
  for (const day of leaveDays) {
    if (seen.has(day)) continue;
    let start = day;
    while (isOff(addDays(start, -1))) start = addDays(start, -1);
    let end = day;
    while (isOff(addDays(end, 1))) end = addDays(end, 1);

    let totalDays = 0;
    let used = 0;
    for (let k = start; k <= end; k = addDays(k, 1)) {
      totalDays++;
      if (leaves[k] === 1) {
        used++;
        seen.add(k);
      }
    }
    breaks.push({ start, end, totalDays, leaveUsed: used });
  }
  return breaks;
}

/** "28 May" or "23 to 31 May" or "30 Dec to 3 Jan". */
export function formatRange(start: DateKey, end: DateKey): string {
  const s = keyToDate(start);
  const e = keyToDate(end);
  const short = (d: Date) => MONTH_NAMES[d.getUTCMonth()].slice(0, 3);
  if (start === end) return `${s.getUTCDate()} ${short(s)}`;
  if (s.getUTCMonth() === e.getUTCMonth())
    return `${s.getUTCDate()} to ${e.getUTCDate()} ${short(e)}`;
  return `${s.getUTCDate()} ${short(s)} to ${e.getUTCDate()} ${short(e)}`;
}
