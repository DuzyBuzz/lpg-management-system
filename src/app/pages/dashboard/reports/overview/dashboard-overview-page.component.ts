import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Chart as ChartJS, registerables } from 'chart.js';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { DashboardBranchSalesRowView, DashboardDistributionPoint } from '../../../../models/dashboard.model';
import {
  branchDistributionChartOptions,
  createBranchDistributionChartData,
  createSalesTrendChartData,
  salesTrendChartOptions
} from '../../dashboard-chart.config';
import { DashboardWorkspaceService } from '../../../../services/dashboard-workspace.service';
import { SummaryCardComponent } from '../../components/summary-card/summary-card.component';

ChartJS.register(...registerables);

@Component({
  selector: 'app-dashboard-overview-page',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TableModule, TagModule, SummaryCardComponent],
  templateUrl: './dashboard-overview-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardOverviewPageComponent {
  readonly workspace = inject(DashboardWorkspaceService);
  readonly topBranch = computed<DashboardDistributionPoint | null>(
    () => this.workspace.branchDistribution()[0] ?? null
  );
  readonly trendChartData = computed(() => createSalesTrendChartData(this.workspace.trendPoints()));
  readonly trendChartOptions = salesTrendChartOptions;
  readonly distributionChartData = computed(() =>
    createBranchDistributionChartData(this.workspace.branchDistribution())
  );
  readonly distributionChartOptions = branchDistributionChartOptions;

  trackByBranchId(_: number, row: DashboardBranchSalesRowView): number {
    return row.branchId;
  }
}
