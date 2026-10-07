import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, max, min, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PlannerStore } from '../../../services/planner-store.service';

/** Shows leave left for the selected year, and lets you change your allowance. */
@Component({
  selector: 'app-balance-card',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <section class="lp-card balance">
      <div class="row">
        <h2>Leave left in {{ store.year() }}</h2>
        @if (!editing()) {
          <button
            mat-button
            type="button"
            (click)="startEdit()"
            aria-label="Change leave allowance"
          >
            <span class="material-symbols-outlined">edit</span> Edit
          </button>
        }
      </div>

      @if (editing()) {
        <form (submit)="save($event)" class="edit">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Total days of leave in {{ store.year() }}</mat-label>
            <input
              matInput
              type="number"
              step="0.5"
              inputmode="decimal"
              [formField]="allowanceForm.days"
            />
            @if (allowanceForm.days().invalid()) {
              <mat-error>Enter a number from 0 to 365</mat-error>
            }
          </mat-form-field>
          <div class="actions">
            <button mat-button type="button" (click)="editing.set(false)">Cancel</button>
            <button mat-flat-button type="submit" [disabled]="allowanceForm().invalid()">
              Save
            </button>
          </div>
        </form>
      } @else {
        <p class="big" [class.low]="store.remaining() <= 0">{{ format(store.remaining()) }}</p>
        <p class="sub">
          of {{ format(store.allowance()) }} days ({{ format(store.used()) }} booked)
        </p>
        <mat-progress-bar
          mode="determinate"
          [value]="percentUsed()"
          aria-label="Share of leave booked"
        />
      }
    </section>
  `,
  styles: `
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--lp-muted);
    }
    .big {
      font-size: 2.75rem;
      font-weight: 800;
      color: var(--lp-leave);
      margin: 4px 0 0;
      line-height: 1.1;
    }
    .big.low {
      color: var(--lp-block);
    }
    .sub {
      margin: 2px 0 12px;
      font-size: 0.85rem;
      color: var(--lp-muted);
    }
    .edit {
      margin-top: 12px;
    }
    mat-form-field {
      width: 100%;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalanceCard {
  protected readonly store = inject(PlannerStore);
  protected readonly editing = signal(false);

  private readonly model = signal({ days: 0 });
  protected readonly allowanceForm = form(this.model, (p) => {
    required(p.days);
    min(p.days, 0);
    max(p.days, 365);
  });

  protected percentUsed(): number {
    const total = this.store.allowance();
    return total > 0 ? Math.min(100, (this.store.used() / total) * 100) : 100;
  }

  protected startEdit(): void {
    this.model.set({ days: this.store.allowance() });
    this.editing.set(true);
  }

  protected save(event: Event): void {
    event.preventDefault();
    if (this.allowanceForm().invalid()) return;
    this.store.setAllowance(this.model().days);
    this.editing.set(false);
  }

  protected format(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
}
