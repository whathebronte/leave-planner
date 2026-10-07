import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { PlannerStore } from '../../../services/planner-store.service';
import { findBreaks, formatRange } from '../../../services/calendar';

/** Lists each break you have booked and how many days off it gives you. */
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
              @if (breaks().length) {
                {{ totalOff() }} days off from {{ totalLeave() }} days of leave
              } @else {
                None booked yet
              }
            </small>
          </span>
        </mat-panel-title>
      </mat-expansion-panel-header>

      @if (breaks().length) {
        <ul>
          @for (b of breaks(); track b.start) {
            <li>
              <span class="range">{{ range(b.start, b.end) }}</span>
              <span class="detail">
                <strong>{{ b.totalDays }} {{ b.totalDays === 1 ? 'day' : 'days' }} off</strong>
                for {{ b.leaveUsed }} {{ b.leaveUsed === 1 ? 'day' : 'days' }} of leave
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
    }
    .head {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 0;
    }
    .head small {
      color: var(--lp-muted);
      font-weight: 400;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 0;
      border-top: 1px solid var(--lp-border);
      font-size: 0.9rem;
    }
    li:first-child {
      border-top: 0;
    }
    .range {
      font-weight: 600;
    }
    .detail {
      color: var(--lp-muted);
      text-align: right;
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
  protected readonly breaks = computed(() => findBreaks(this.store.leaves(), this.store.year()));
  protected readonly totalOff = computed(() => this.breaks().reduce((s, b) => s + b.totalDays, 0));
  protected readonly totalLeave = computed(() =>
    this.breaks().reduce((s, b) => s + b.leaveUsed, 0),
  );
  protected range = formatRange;
}
