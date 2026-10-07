import { describe, expect, it } from 'vitest';
import { buildBackupJson, buildIcs, parseBackupJson } from './export';

describe('export', () => {
  it('joins consecutive full days into one calendar event', () => {
    const ics = buildIcs(
      { '2026-05-25': 1, '2026-05-26': 1, '2026-05-28': 0.5, '2026-05-29': -1 },
      2026,
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260525');
    expect(ics).toContain('DTEND;VALUE=DATE:20260527');
    expect(ics).toContain('SUMMARY:Half day leave');
    expect(ics).not.toContain('DTSTART;VALUE=DATE:20260529'); // blocked days are not exported
  });

  it('only exports the chosen year', () => {
    expect(buildIcs({ '2027-02-09': 1 }, 2026)).not.toContain('VEVENT');
  });

  it('round-trips a backup file', () => {
    const json = buildBackupJson({
      id: 'x',
      ownerUid: null,
      totals: { '2026': 20 },
      leaves: { '2026-01-02': 1 },
    });
    expect(parseBackupJson(json)).toEqual({ totals: { '2026': 20 }, leaves: { '2026-01-02': 1 } });
  });

  it('rejects files that are not backups', () => {
    expect(parseBackupJson('hello')).toBeNull();
    expect(parseBackupJson('{"foo":1}')).toBeNull();
  });
});
