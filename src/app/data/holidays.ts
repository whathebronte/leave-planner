import { DateKey } from '../models/planner.model';

export interface Holiday {
  date: DateKey;
  name: string;
  /** True for an "off-in-lieu" day given because the holiday fell on a Sunday. */
  inLieu: boolean;
}

export interface YearData {
  holidays: Holiday[];
  /** Hand-picked days that turn holidays into long breaks. */
  suggestions: DateKey[];
}

/**
 * Singapore public holidays, as published by the Ministry of Manpower.
 * To add a new year: copy a block, update the dates, and it appears in the year switcher.
 */
export const YEARS: Record<number, YearData> = {
  2026: {
    holidays: [
      { date: '2026-01-01', name: "New Year's Day", inLieu: false },
      { date: '2026-02-17', name: 'Chinese New Year', inLieu: false },
      { date: '2026-02-18', name: 'Chinese New Year (Day 2)', inLieu: false },
      { date: '2026-03-21', name: 'Hari Raya Puasa', inLieu: false },
      { date: '2026-04-03', name: 'Good Friday', inLieu: false },
      { date: '2026-05-01', name: 'Labour Day', inLieu: false },
      { date: '2026-05-27', name: 'Hari Raya Haji', inLieu: false },
      { date: '2026-05-31', name: 'Vesak Day', inLieu: false },
      { date: '2026-06-01', name: 'Vesak Day (in lieu)', inLieu: true },
      { date: '2026-08-09', name: 'National Day', inLieu: false },
      { date: '2026-08-10', name: 'National Day (in lieu)', inLieu: true },
      { date: '2026-11-08', name: 'Deepavali', inLieu: false },
      { date: '2026-11-09', name: 'Deepavali (in lieu)', inLieu: true },
      { date: '2026-12-25', name: 'Christmas Day', inLieu: false },
    ],
    suggestions: [
      '2026-01-02',
      '2026-02-16',
      '2026-02-19',
      '2026-02-20',
      '2026-03-20',
      '2026-05-25',
      '2026-05-26',
      '2026-05-28',
      '2026-05-29',
      '2026-08-07',
      '2026-12-21',
      '2026-12-22',
      '2026-12-23',
      '2026-12-24',
    ],
  },
  2027: {
    holidays: [
      { date: '2027-01-01', name: "New Year's Day", inLieu: false },
      { date: '2027-02-06', name: 'Chinese New Year', inLieu: false },
      { date: '2027-02-07', name: 'Chinese New Year (Day 2)', inLieu: false },
      { date: '2027-02-08', name: 'Chinese New Year (in lieu)', inLieu: true },
      { date: '2027-03-10', name: 'Hari Raya Puasa', inLieu: false },
      { date: '2027-03-26', name: 'Good Friday', inLieu: false },
      { date: '2027-05-01', name: 'Labour Day', inLieu: false },
      { date: '2027-05-17', name: 'Hari Raya Haji', inLieu: false },
      { date: '2027-05-20', name: 'Vesak Day', inLieu: false },
      { date: '2027-08-09', name: 'National Day', inLieu: false },
      { date: '2027-10-28', name: 'Deepavali', inLieu: false },
      { date: '2027-12-25', name: 'Christmas Day', inLieu: false },
    ],
    suggestions: [
      // CNY: 4 days of leave -> 9 days off (6 to 14 Feb)
      '2027-02-09',
      '2027-02-10',
      '2027-02-11',
      '2027-02-12',
      // Hari Raya Puasa: 4 days -> 9 days off (6 to 14 Mar)
      '2027-03-08',
      '2027-03-09',
      '2027-03-11',
      '2027-03-12',
      // Hari Raya Haji + Vesak: 3 days -> 9 days off (15 to 23 May)
      '2027-05-18',
      '2027-05-19',
      '2027-05-21',
      // Deepavali: 1 day -> 4 days off (28 to 31 Oct)
      '2027-10-29',
    ],
  },
};

export const AVAILABLE_YEARS: number[] = Object.keys(YEARS).map(Number).sort();

export function holidayFor(date: DateKey): Holiday | undefined {
  return YEARS[Number(date.slice(0, 4))]?.holidays.find((h) => h.date === date);
}
