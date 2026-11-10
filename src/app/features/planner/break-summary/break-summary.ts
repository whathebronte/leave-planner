import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { PlannerStore } from '../../../services/planner-store.service';
import { findBreaks, findHalfDays, formatRange } from '../../../services/calendar';
import { DateKey } from '../../../models/planner.model';

/** One line in the list: a break of full days off, or a single half day. */
interface Entry {
  start: DateKey;
  range: string;
  off: string;
  leave: string;
}

/** Lists each break you have booked (and any half days) and how much time off it gives you. */
@Component({
  selector: 'app-break-summary',
  imports: [MatExpansionModule],
  template: `
    <mat-expansion-panel class="summary">
      <mat-expansion-panel-header>
        <mat-panel-title>
          <span class="head">
            <strong>Your breaks in {{ store.year() }}</strong>
            <small>
              @if (entries().length) {
                {{ summary() }}
              } @else {
                None booked yet
              }
            </small>
          </span>
        </mat-panel-title>
      </mat-expansion-panel-header>

      @if (entries().length) {
        <ul>
          @for (e of entries(); track e.start) {
            <li>
              <span class="range">{{ e.range }}</span>
              <span class="detail">
                <strong>{{ e.off }} off</strong> for {{ e.leave }} of leave
              </span>
            </li>
          }
        </ul>
      } @else {
        <p class="empty">
          Tap a work day to book leave. Yellow days are good picks that join up with holidays and
          weekends.
        </p>
      }
    </mat-expansion-panel>
  `,
  styles: `
    .summary {
      border-radius: var(--lp-radius) !important;
      box-shadow: var(--lp-shadow) !important;
      /* The header holds two lines (title and summary), so let it grow instead of
         squeezing them into Material's fixed 48px / 64px row. */
      --mat-expansion-header-collapsed-state-height: auto;
      --mat-expansion-header-expanded-state-height: auto;
    }
    .head {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 14px 0;
    }
    .head small {
      color: var(--lp-muted);
      font-weight: 400;
      font-variant-numeric: tabular-nums;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    /* Date on the left, details right beside it, so each line reads straight across. */
    li {
      display: grid;
      grid-template-columns: minmax(9rem, max-content) 1fr;
      gap: 2px 16px;
      align-items: baseline;
      padding: 10px 0;
      border-top: 1px solid var(--lp-border);
      font-size: 0.9rem;
    }
    li:first-child {
      border-top: 0;
    }
    /* On phones, stack the details under the date instead of squeezing them. */
    @media (max-width: 479px) {
      li {
        grid-template-columns: 1fr;
      }
    }
    .range {
      font-weight: 600;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .detail {
      color: var(--lp-muted);
    }
    strong {
      color: var(--lp-leave-dark);
    }
    .empty {
      color: var(--lp-muted);
      font-size: 0.9rem;
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakSummary {
  protected readonly store = inject(PlannerStore);

  private readonly breaks = computed(() => findBreaks(this.store.leaves(), this.store.year()));
  private readonly halfDays = computed(() => findHalfDays(this.store.leaves(), this.store.year()));

  /** Full-day breaks and half days together, in date order. */
  protected readonly entries = computed<Entry[]>(() => {
    const full = this.breaks().map((b) => ({
      start: b.start,
      range: formatRange(b.start, b.end),
      off: this.days(b.totalDays),
      leave: this.days(b.leaveUsed),
    }));
    const half = this.halfDays().map((d) => ({
      start: d,
      range: formatRange(d, d),
      off: 'Half a day',
      leave: 'half a day',
    }));
    return [...full, ...half].sort((a, b) => a.start.localeCompare(b.start));
  });

  /** Days off across every break, with each half day counting as half. */
  protected readonly totalOff = computed(
    () => this.breaks().reduce((s, b) => s + b.totalDays, 0) + this.halfDays().length / 2,
  );

  /** "15.5 days off from 7.5 days of leave", starting with a capital. */
  protected readonly summary = computed(() => {
    const text = `${this.days(this.totalOff())} off from ${this.days(this.store.used())} of leave`;
    return text.charAt(0).toUpperCase() + text.slice(1);
  });

  /** "half a day", "1 day", "4 days", "7.5 days". */
  protected days(n: number): string {
    if (n === 0.5) return 'half a day';
    const value = Number.isInteger(n) ? String(n) : n.toFixed(1);
    return `${value} ${n === 1 ? 'day' : 'days'}`;
  }
}
