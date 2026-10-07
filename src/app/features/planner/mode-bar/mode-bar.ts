import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlannerStore } from '../../../services/planner-store.service';
import { Mode } from '../../../models/planner.model';

/** Bottom bar: choose what a tap does, and undo the last tap. */
@Component({
  selector: 'app-mode-bar',
  imports: [MatButtonModule, MatTooltipModule],
  template: `
    <nav class="bar" aria-label="Tap mode">
      @for (m of modes; track m.id) {
        <button
          type="button"
          class="mode {{ m.id }}"
          [class.active]="store.mode() === m.id"
          [attr.aria-pressed]="store.mode() === m.id"
          (click)="store.mode.set(m.id)"
        >
          <span class="icon material-symbols-outlined">{{ m.icon }}</span>
          <span class="text">
            <strong>{{ m.title }}</strong>
            <small>{{ m.hint }}</small>
          </span>
        </button>
      }
      <button
        mat-icon-button
        type="button"
        class="undo"
        [disabled]="!store.canUndo()"
        (click)="store.undo()"
        aria-label="Undo last tap"
        matTooltip="Undo last tap"
      >
        <span class="material-symbols-outlined">undo</span>
      </button>
    </nav>
  `,
  styles: `
    .bar {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 10;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
      background: rgb(255 255 255 / 0.95);
      backdrop-filter: blur(8px);
      border-top: 1px solid var(--lp-border);
      box-shadow: 0 -4px 20px rgb(0 0 0 / 0.06);
    }
    .mode {
      all: unset;
      box-sizing: border-box;
      cursor: pointer;
      flex: 1 1 0;
      max-width: 260px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 14px;
      border: 2px solid transparent;
      opacity: 0.55;
      filter: grayscale(1);
      transition: all 0.15s ease;
    }
    .mode:focus-visible {
      outline: 3px solid var(--lp-holiday);
    }
    .mode.active {
      opacity: 1;
      filter: none;
    }
    .mode.leave.active {
      background: #f0fdf4;
      border-color: var(--lp-leave);
    }
    .mode.block.active {
      background: #fef2f2;
      border-color: var(--lp-block);
    }
    .icon {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex: none;
    }
    .leave .icon {
      background: #d1fae5;
      color: var(--lp-leave-dark);
    }
    .block .icon {
      background: #fee2e2;
      color: #b91c1c;
    }
    .text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      min-width: 0;
    }
    strong {
      font-size: 0.8rem;
    }
    small {
      font-size: 0.65rem;
      color: var(--lp-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModeBar {
  protected readonly store = inject(PlannerStore);
  protected readonly modes: { id: Mode; icon: string; title: string; hint: string }[] = [
    { id: 'leave', icon: 'event_available', title: 'Book leave', hint: 'Tap: full, half, clear' },
    { id: 'block', icon: 'block', title: 'Block dates', hint: 'Tap to block a work day' },
  ];
}
