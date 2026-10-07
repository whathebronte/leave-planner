import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CalendarDay, CalendarMonth, toKey } from '../../../services/calendar';
import { DateKey, DayValue } from '../../../models/planner.model';

type Kind = 'full' | 'half' | 'block' | 'holiday' | 'weekend' | 'suggested' | 'plain';

interface Cell {
  day: CalendarDay;
  kind: Kind;
  tag: string;
  label: string;
  editable: boolean;
  today: boolean;
}

/** One month of the calendar. Shows days and reports taps; it does not save anything itself. */
@Component({
  selector: 'app-month-calendar',
  templateUrl: './month-calendar.html',
  styleUrl: './month-calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthCalendar {
  readonly month = input.required<CalendarMonth>();
  readonly year = input.required<number>();
  readonly leaves = input.required<Record<DateKey, DayValue>>();
  readonly tapped = output<DateKey>();

  protected readonly weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  protected readonly blanks = computed(() => Array.from({ length: this.month().leadingBlanks }));

  protected readonly cells = computed<Cell[]>(() => {
    const leaves = this.leaves();
    const now = new Date();
    const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());
    return this.month().days.map((day) => {
      const value = leaves[day.key];
      const kind = kindOf(day, value);
      const name = `${day.day} ${this.month().name}`;
      return {
        day,
        kind,
        tag: tagOf(day, kind),
        label: `${name}: ${describe(day, kind)}`,
        editable: !day.isWeekend && !day.holiday,
        today: day.key === todayKey,
      };
    });
  });

  protected readonly leaveCount = computed(() =>
    this.month().days.reduce((sum, d) => {
      const v = this.leaves()[d.key];
      return sum + (v && v > 0 ? v : 0);
    }, 0),
  );
}

function kindOf(day: CalendarDay, value: DayValue | undefined): Kind {
  if (day.holiday) return 'holiday';
  if (day.isWeekend) return 'weekend';
  if (value === 1) return 'full';
  if (value === 0.5) return 'half';
  if (value === -1) return 'block';
  return day.suggested ? 'suggested' : 'plain';
}

function tagOf(day: CalendarDay, kind: Kind): string {
  switch (kind) {
    case 'holiday':
      return day.holiday?.inLieu ? 'OFF' : 'PH';
    case 'full':
      return 'FULL';
    case 'half':
      return 'HALF';
    case 'block':
      return 'BLOCK';
    default:
      return '';
  }
}

function describe(day: CalendarDay, kind: Kind): string {
  switch (kind) {
    case 'holiday':
      return day.holiday?.name ?? 'public holiday';
    case 'weekend':
      return 'weekend';
    case 'full':
      return 'full day leave';
    case 'half':
      return 'half day leave';
    case 'block':
      return 'blocked';
    case 'suggested':
      return 'suggested leave day';
    default:
      return 'work day';
  }
}
