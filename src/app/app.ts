import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlannerPage } from './features/planner/planner-page';

@Component({
  selector: 'app-root',
  imports: [PlannerPage],
  template: '<app-planner-page />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
