import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Chart as ChartJS, registerables } from 'chart.js';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { DashboardSummaryCardView, DashboardTagSeverity, DashboardTrendPoint } from '../../../models/dashboard.model';
import { createSalesTrendChartData, salesTrendChartOptions } from '../dashboard-chart.config';
import { DashboardWorkspaceService } from '../dashboard-workspace.service';
import { SummaryCardComponent } from '../components/summary-card/summary-card.component';

type TrendTableRowView = {
  label: string;
  total: number;
  totalLabel: string;
  quantity: number;
  quantityLabel: string;
  statusLabel: string;
  statusSeverity: DashboardTagSeverity;
};

ChartJS.register(...registerables);

@Component({
  selector: 'app-dashboard-trend-page',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TableModule, TagModule, SummaryCardComponent],
  templateUrl: './dashboard-trend-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardTrendPageComponent {
  readonly workspace = inject(DashboardWorkspaceService);
  readonly trendChartData = computed(() => createSalesTrendChartData(this.workspace.trendPoints()));
  readonly trendChartOptions = salesTrendChartOptions;
  readonly highestPoint = computed<DashboardTrendPoint | null>(() => {
    return [...this.workspace.trendPoints()].sort((left, right) => right.total - left.total)[0] ?? null;
  });
  readonly latestPoint = computed(() => {
    const points = this.workspace.trendPoints();

    return points.length > 0 ? points[points.length - 1] : null;
  });
  readonly trendSummaryCards = computed<ReadonlyArray<DashboardSummaryCardView>>(() => {
    const highestPoint = this.highestPoint();
    const latestPoint = this.latestPoint();
    const totals = this.workspace.totals();
    const points = this.workspace.trendPoints();

    return [
      {
        label: 'Tracked Points',
        value: `${points.length}`,
        helperText: this.workspace.trendGroupingLabel(),
        icon: 'pi pi-calendar',
        tagLabel: this.workspace.selectedPeriodLabel(),
        severity: 'secondary',
        accentClass: 'bg-slate-100 text-slate-700'
      },
      {
        label: 'Peak Revenue',
        value: highestPoint ? this.formatCurrency(highestPoint.total) : this.formatCurrency(0),
        helperText: highestPoint?.label ?? 'No peak period available',
        icon: 'pi pi-arrow-up-right',
        tagLabel: highestPoint ? 'Highest point' : 'Awaiting data',
        severity: 'success',
        accentClass: 'bg-emerald-100 text-emerald-700'
      },
      {
        label: 'Latest Revenue',
        value: latestPoint ? this.formatCurrency(latestPoint.total) : this.formatCurrency(0),
        helperText: latestPoint?.label ?? 'No recent point available',
        icon: 'pi pi-history',
        tagLabel: latestPoint ? 'Latest point' : 'Awaiting data',
        severity: 'info',
        accentClass: 'bg-sky-100 text-sky-700'
      },
      {
        label: 'Total Volume',
        value: this.formatDecimal(totals?.totalVolume ?? 0),
        helperText: 'Metered quantity represented in the selected range',
        icon: 'pi pi-gauge',
        tagLabel: totals ? `${totals.meteredAccounts} metered rows` : 'Awaiting data',
        severity: 'warn',
        accentClass: 'bg-amber-100 text-amber-700'
      }
    ];
  });
  readonly trendTableRows = computed<TrendTableRowView[]>(() => {
    const highestLabel = this.highestPoint()?.label;
    const latestLabel = this.latestPoint()?.label;

    return this.workspace.trendPoints().map((point) => {
      const isPeak = point.label === highestLabel;
      const isLatest = point.label === latestLabel;

      return {
        label: point.label,
        total: point.total,
        totalLabel: this.formatCurrency(point.total),
        quantity: point.quantity,
        quantityLabel: this.formatDecimal(point.quantity),
        statusLabel: isPeak ? 'Peak' : isLatest ? 'Latest' : 'Observed',
        statusSeverity: isPeak ? 'success' : isLatest ? 'info' : 'secondary'
      };
    });
  });

  trackByTrendLabel(_: number, row: TrendTableRowView): string {
    return row.label;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private formatDecimal(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
