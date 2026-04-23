import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { DashboardSummaryCardView, DashboardVolumeSalesRowView } from '../../../models/dashboard.model';
import {
  createVolumeTrendChartData,
  volumeTrendChartOptions
} from '../dashboard-chart.config';
import { DashboardWorkspaceService } from '../dashboard-workspace.service';
import { SummaryCardComponent } from '../components/summary-card/summary-card.component';

@Component({
  selector: 'app-dashboard-volume-sales-page',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TableModule, TagModule, SummaryCardComponent],
  templateUrl: './dashboard-volume-sales-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardVolumeSalesPageComponent {
  readonly workspace = inject(DashboardWorkspaceService);
  readonly volumeChartData = computed(() => createVolumeTrendChartData(this.workspace.trendPoints()));
  readonly volumeChartOptions = volumeTrendChartOptions;
  readonly volumeSummaryCards = computed<ReadonlyArray<DashboardSummaryCardView>>(() => {
    const rows = this.workspace.volumeSalesRows();
    const topQuantityRow = rows[0] ?? null;
    const totalValue = rows.reduce((sum, row) => sum + row.total, 0);
    const totals = this.workspace.totals();

    return [
      {
        label: 'Total Volume',
        value: this.formatDecimal(totals?.totalVolume ?? 0),
        helperText: 'Metered quantity captured in the active period',
        icon: 'pi pi-gauge',
        tagLabel: `${totals?.meteredAccounts ?? 0} metered rows`,
        severity: 'success',
        accentClass: 'bg-emerald-100 text-emerald-700'
      },
      {
        label: 'Metered Value',
        value: this.formatCurrency(totalValue),
        helperText: 'Total metered billing derived from live reading rows',
        icon: 'pi pi-wallet',
        tagLabel: this.workspace.selectedPeriodLabel(),
        severity: 'info',
        accentClass: 'bg-sky-100 text-sky-700'
      },
      {
        label: 'Top Account',
        value: topQuantityRow?.quantityLabel ?? this.formatDecimal(0),
        helperText: topQuantityRow?.accountName ?? 'No quantity leader available',
        icon: 'pi pi-star',
        tagLabel: topQuantityRow ? 'Highest quantity' : 'Awaiting data',
        severity: 'warn',
        accentClass: 'bg-amber-100 text-amber-700'
      },
      {
        label: 'Variance Alerts',
        value: this.formatCount(
          rows.filter((row) => row.varianceSeverity === 'danger' || row.varianceSeverity === 'warn').length
        ),
        helperText: 'Rows that require monitoring for unusual variance levels',
        icon: 'pi pi-exclamation-triangle',
        tagLabel: this.workspace.highVarianceLabel(),
        severity: 'danger',
        accentClass: 'bg-rose-100 text-rose-700'
      }
    ];
  });

  trackByVolumeId(_: number, row: DashboardVolumeSalesRowView): number {
    return row.id;
  }

  private formatCount(value: number): string {
    return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(value);
  }

  private formatDecimal(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
