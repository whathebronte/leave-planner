import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { isPlannerId, parsePlannerId } from '../../../services/planner-store.service';

/** Asks for a planner link or ID. Closes with the text entered, or nothing if cancelled. */
@Component({
  selector: 'app-open-planner-dialog',
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Open another planner</h2>
    <form (submit)="submit($event)">
      <mat-dialog-content>
        <p>Paste the full link (or the planner ID) from your other device.</p>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Planner link or ID</mat-label>
          <input
            matInput
            [formField]="linkForm.value"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
          @if (linkForm.value().touched() && linkForm.value().invalid()) {
            <mat-error>That does not look like a planner link or ID</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="linkForm().invalid()">Open</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .full {
      width: 100%;
    }
    p {
      margin-top: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenPlannerDialog {
  private readonly ref = inject(MatDialogRef<OpenPlannerDialog, string>);
  private readonly model = signal({ value: '' });
  protected readonly linkForm = form(this.model, (p) => {
    required(p.value);
    validate(p.value, ({ value }) => {
      const text = value().trim();
      return parsePlannerId(text) || isPlannerId(text) ? undefined : { kind: 'planner' };
    });
  });

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.linkForm().invalid()) return;
    this.ref.close(this.model().value.trim());
  }
}
