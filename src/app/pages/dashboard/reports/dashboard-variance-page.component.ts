import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { DashboardSummaryCardView, DashboardVarianceRowView } from '../../../models/dashboard.model';
import { createVarianceChartData, varianceChartOptions } from '../dashboard-chart.config';
import { DashboardWorkspaceService } from '../dashboard-workspace.service';
import { SummaryCardComponent } from '../components/summary-card/summary-card.component';

@Component({
  selector: 'app-dashboard-variance-page',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TableModule, TagModule, SummaryCardComponent],
  templateUrl: './dashboard-variance-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardVariancePageComponent {
  readonly workspace = inject(DashboardWorkspaceService);
  readonly varianceChartData = computed(() => createVarianceChartData(this.workspace.varianceRows()));
  readonly varianceChartOptions = varianceChartOptions;
  readonly alertCount = computed(
    () => this.workspace.varianceRows().filter((row) => row.varianceSeverity === 'danger').length
  );
  readonly monitorCount = computed(
    () => this.workspace.varianceRows().filter((row) => row.varianceSeverity === 'warn').length
  );
  readonly varianceSummaryCards = computed<ReadonlyArray<DashboardSummaryCardView>>(() => {
    const rows = this.workspace.varianceRows();
    const topVarianceRow = rows[0] ?? null;
    const atRiskValue = rows
      .filter((row) => row.varianceSeverity === 'danger' || row.varianceSeverity === 'warn')
      .reduce((sum, row) => sum + row.total, 0);

    return [
      {
        label: 'Highest Variance',
        value: topVarianceRow?.varianceLabel ?? this.formatDecimal(0),
        helperText: topVarianceRow?.accountName ?? 'No variance leader available',
        icon: 'pi pi-arrow-up-right',
        tagLabel: topVarianceRow ? 'Largest movement' : 'Awaiting data',
        severity: 'danger',
        accentClass: 'bg-rose-100 text-rose-700'
      },
      {
        label: 'Alert Rows',
        value: this.formatCount(this.alertCount()),
        helperText: 'Rows above the highest variance threshold',
        icon: 'pi pi-exclamation-triangle',
        tagLabel: 'Immediate review',
        severity: 'danger',
        accentClass: 'bg-rose-100 text-rose-700'
      },
      {
        label: 'Monitor Rows',
        value: this.formatCount(this.monitorCount()),
        helperText: 'Rows that should be monitored for developing variance',
        icon: 'pi pi-eye',
        tagLabel: 'Watch closely',
        severity: 'warn',
        accentClass: 'bg-amber-100 text-amber-700'
      },
      {
        label: 'At-risk Value',
        value: this.formatCurrency(atRiskValue),
        helperText: 'Billing value tied to warning and alert variance rows',
        icon: 'pi pi-wallet',
        tagLabel: this.workspace.selectedPeriodLabel(),
        severity: 'info',
        accentClass: 'bg-sky-100 text-sky-700'
      }
    ];
  });

  trackByVarianceId(_: number, row: DashboardVarianceRowView): number {
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
