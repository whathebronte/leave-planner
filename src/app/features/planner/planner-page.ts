import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AVAILABLE_YEARS } from '../../data/holidays';
import { AuthService } from '../../services/auth.service';
import { buildYear } from '../../services/calendar';
import { LocalBackupService } from '../../services/local-backup.service';
import { PlannerStore } from '../../services/planner-store.service';
import { BalanceCard } from './balance-card/balance-card';
import { BreakSummary } from './break-summary/break-summary';
import { Legend } from './legend/legend';
import { ModeBar } from './mode-bar/mode-bar';
import { MonthCalendar } from './month-calendar/month-calendar';
import { PlannerHeader } from './planner-header/planner-header';

/** The whole planner screen, including the loading, offline, not found and error states. */
@Component({
  selector: 'app-planner-page',
  imports: [
    BalanceCard,
    BreakSummary,
    Legend,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    ModeBar,
    MonthCalendar,
    PlannerHeader,
  ],
  templateUrl: './planner-page.html',
  styleUrl: './planner-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerPage {
  protected readonly store = inject(PlannerStore);
  protected readonly auth = inject(AuthService);
  private readonly backup = inject(LocalBackupService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly years = AVAILABLE_YEARS;
  protected readonly months = computed(() => buildYear(this.store.year()));

  /**
   * If the planner on the server is empty but this device has a backup with bookings,
   * offer to put them back. This is the safety net for the "everything disappeared" problem.
   */
  protected readonly recoverable = computed(() => {
    const planner = this.store.planner();
    if (this.store.status() !== 'ready' || !planner || Object.keys(planner.leaves).length > 0)
      return null;
    const saved = this.backup.get(planner.id);
    return saved && Object.keys(saved.planner.leaves).length > 0 ? saved : null;
  });

  constructor() {
    effect(() => {
      const notice = this.store.notice();
      if (notice)
        this.snackBar.open(notice.text, undefined, { duration: 3000, verticalPosition: 'top' });
    });
  }

  protected restoreLocal(): void {
    const saved = this.recoverable();
    if (!saved) return;
    this.store.replaceAll({ leaves: saved.planner.leaves, totals: saved.planner.totals });
    this.store.say('Restored from this device');
  }

  protected dismissLocal(): void {
    const id = this.store.plannerId();
    if (id) this.backup.clear(id);
    this.store.say('Backup on this device removed');
  }

  protected startNew(): void {
    void this.store.createPlanner(this.auth.isGoogle() ? (this.auth.user()?.uid ?? null) : null);
  }

  protected signIn(): void {
    this.auth
      .signInWithGoogle()
      .catch(() => this.store.say('Google sign-in failed. Please try again.'));
  }

  protected reload(): void {
    window.location.reload();
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected countDays(leaves: Record<string, number>): number {
    return Object.values(leaves).filter((v) => v > 0).length;
  }
}
