/**
 * Turns the planner into files you can keep: a backup (.json) and a calendar file (.ics)
 * that Google Calendar, Apple Calendar and Outlook can import.
 */
import { DateKey, DayValue, Planner, plannerFromFirestore } from '../models/planner.model';
import { addDays } from './calendar';

export function buildBackupJson(planner: Planner): string {
  return JSON.stringify(
    {
      app: 'leave-planner',
      exportedAt: new Date().toISOString(),
      totals: planner.totals,
      leaves: planner.leaves,
    },
    null,
    2,
  );
}

/** Reads a backup file. Returns null if it is not a valid backup. */
export function parseBackupJson(text: string): Pick<Planner, 'leaves' | 'totals'> | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null || !('leaves' in raw)) return null;
    const { leaves, totals } = plannerFromFirestore('import', raw as Record<string, unknown>);
    return { leaves, totals };
  } catch {
    return null;
  }
}

/** One calendar event per run of consecutive leave days in the year. */
export function buildIcs(leaves: Record<DateKey, DayValue>, year: number): string {
  const days = Object.keys(leaves)
    .filter((k) => k.startsWith(`${year}-`) && (leaves[k] === 1 || leaves[k] === 0.5))
    .sort();

  const events: string[] = [];
  let i = 0;
  while (i < days.length) {
    const start = days[i];
    const half = leaves[start] === 0.5;
    let end = start;
    // Join full days that follow each other. Half days are always their own event.
    while (
      !half &&
      i + 1 < days.length &&
      days[i + 1] === addDays(end, 1) &&
      leaves[days[i + 1]] === 1
    ) {
      end = days[++i];
    }
    i++;
    const compact = (k: DateKey) => k.replaceAll('-', '');
    events.push(
      [
        'BEGIN:VEVENT',
        `UID:leave-${compact(start)}@leave-planner`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
        `DTSTART;VALUE=DATE:${compact(start)}`,
        `DTEND;VALUE=DATE:${compact(addDays(end, 1))}`,
        `SUMMARY:${half ? 'Half day leave' : 'Annual leave'}`,
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ].join('\r\n'),
    );
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leave Planner//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
