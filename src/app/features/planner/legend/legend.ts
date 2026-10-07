import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The colour key. */
@Component({
  selector: 'app-legend',
  template: `
    <ul class="legend" aria-label="Calendar key">
      @for (item of items; track item.label) {
        <li><span class="dot {{ item.cls }}"></span>{{ item.label }}</li>
      }
    </ul>
  `,
  styles: `
    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 0.75rem;
      color: var(--lp-muted);
      font-weight: 500;
    }
    li {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      border: 1px solid transparent;
    }
    .holiday {
      background: var(--lp-holiday);
    }
    .weekend {
      background: var(--lp-weekend);
      border-color: var(--lp-border);
    }
    .suggested {
      background: var(--lp-suggested);
    }
    .full {
      background: var(--lp-leave);
    }
    .half {
      background: linear-gradient(to right, var(--lp-leave) 50%, #fff 50%);
      border-color: var(--lp-leave);
    }
    .block {
      background: var(--lp-block);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Legend {
  protected readonly items = [
    { cls: 'holiday', label: 'Public holiday' },
    { cls: 'weekend', label: 'Weekend' },
    { cls: 'suggested', label: 'Suggested' },
    { cls: 'full', label: 'Full leave' },
    { cls: 'half', label: 'Half leave' },
    { cls: 'block', label: 'Blocked' },
  ];
}
