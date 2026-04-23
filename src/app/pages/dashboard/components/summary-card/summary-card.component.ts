import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { DashboardSummaryCardView } from '../../../../models/dashboard.model';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule, CardModule, TagModule],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryCardComponent {
  readonly card = input.required<DashboardSummaryCardView>();
}