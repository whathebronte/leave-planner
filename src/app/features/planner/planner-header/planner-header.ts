import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';
import { PlannerStore } from '../../../services/planner-store.service';
import { buildBackupJson, buildIcs, downloadFile, parseBackupJson } from '../../../services/export';
import { OpenPlannerDialog } from '../dialogs/open-planner-dialog';
import { ConfirmDialog, ConfirmData } from '../dialogs/confirm-dialog';

/** Title bar: save status, Google sign-in, and the menu of planner actions. */
@Component({
  selector: 'app-planner-header',
  imports: [MatButtonModule, MatDividerModule, MatMenuModule, MatTooltipModule],
  templateUrl: './planner-header.html',
  styleUrl: './planner-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerHeader {
  protected readonly store = inject(PlannerStore);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  protected readonly syncLabel = computed(() => {
    if (this.store.status() !== 'ready') return '';
    switch (this.store.sync()) {
      case 'saving':
        return 'Saving...';
      case 'offline':
        return 'Offline: changes will sync later';
      case 'error':
        return 'Not saved';
      default:
        return 'All changes saved';
    }
  });

  protected async signIn(): Promise<void> {
    try {
      await this.auth.signInWithGoogle();
    } catch {
      this.store.say('Google sign-in failed. Please try again.');
    }
  }

  protected async signOut(): Promise<void> {
    const ok = await this.confirm({
      title: 'Sign out?',
      message:
        'Your planner stays saved to your Google account. You will need to sign in again to open it on this device.',
      confirm: 'Sign out',
    });
    if (ok) await this.auth.signOut();
  }

  protected copyLink(): void {
    const link = this.store.shareLink();
    navigator.clipboard
      .writeText(link)
      .then(() =>
        this.store.say(
          this.store.isOwnedByMe()
            ? 'Link copied. It only opens when signed in to your Google account.'
            : 'Link copied',
        ),
      )
      .catch(() => this.store.say('Could not copy. Your link is in the address bar.'));
  }

  protected openOther(): void {
    this.dialog
      .open<OpenPlannerDialog, void, string>(OpenPlannerDialog, { width: '420px' })
      .afterClosed()
      .subscribe((text) => {
        if (text && this.store.openFromInput(text)) this.store.say('Opening planner...');
      });
  }

  protected async startNew(): Promise<void> {
    const ok = await this.confirm({
      title: 'Start a new planner?',
      message:
        'This opens a new, empty planner. Your current one is not deleted: copy its link first if you want to come back to it.',
      confirm: 'Start new',
    });
    if (ok)
      await this.store.createPlanner(this.auth.isGoogle() ? (this.auth.user()?.uid ?? null) : null);
  }

  protected exportCalendar(): void {
    const year = this.store.year();
    downloadFile(`leave-${year}.ics`, buildIcs(this.store.leaves(), year), 'text/calendar');
  }

  protected downloadBackup(): void {
    const planner = this.store.planner();
    if (!planner) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`leave-planner-backup-${date}.json`, buildBackupJson(planner), 'application/json');
  }

  protected async restoreFromFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const data = parseBackupJson(await file.text());
    if (!data) {
      this.store.say('That file is not a leave planner backup');
      return;
    }
    const ok = await this.confirm({
      title: 'Restore this backup?',
      message: `This replaces everything in the current planner with the ${Object.keys(data.leaves).length} days in the backup file.`,
      confirm: 'Restore',
    });
    if (ok) {
      this.store.replaceAll(data);
      this.store.say('Backup restored');
    }
  }

  private confirm(data: ConfirmData): Promise<boolean> {
    return new Promise((resolve) =>
      this.dialog
        .open<ConfirmDialog, ConfirmData, boolean>(ConfirmDialog, { data, width: '420px' })
        .afterClosed()
        .subscribe((result) => resolve(result === true)),
    );
  }
}
