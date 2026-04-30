import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { DashboardCollectionRowView, DashboardSummaryCardView } from '../../../../models/dashboard.model';
import {
  collectionStatusChartOptions,
  createCollectionStatusChartData
} from '../../dashboard-chart.config';
import { DashboardWorkspaceService } from '../../../../services/dashboard-workspace.service';
import { SummaryCardComponent } from '../../components/summary-card/summary-card.component';

@Component({
  selector: 'app-dashboard-collections-page',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TableModule, TagModule, SummaryCardComponent],
  templateUrl: './dashboard-collections-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardCollectionsPageComponent {
  readonly workspace = inject(DashboardWorkspaceService);
  readonly collectionChartData = computed(() =>
    createCollectionStatusChartData(this.workspace.collectionRows())
  );
  readonly collectionChartOptions = collectionStatusChartOptions;
  readonly paidCount = computed(
    () => this.workspace.collectionRows().filter((row) => row.statusLabel === 'Paid').length
  );
  readonly partialCount = computed(
    () => this.workspace.collectionRows().filter((row) => row.statusLabel === 'Partial').length
  );
  readonly unpaidCount = computed(
    () => this.workspace.collectionRows().filter((row) => row.statusLabel === 'Unpaid').length
  );
  readonly collectionSummaryCards = computed<ReadonlyArray<DashboardSummaryCardView>>(() => {
    const rows = this.workspace.collectionRows();
    const totals = this.workspace.totals();
    const paidExposure = rows
      .filter((row) => row.statusLabel === 'Paid')
      .reduce((sum, row) => sum + row.total, 0);
    const partialExposure = rows
      .filter((row) => row.statusLabel === 'Partial')
      .reduce((sum, row) => sum + row.total, 0);
    const unpaidExposure = rows
      .filter((row) => row.statusLabel === 'Unpaid')
      .reduce((sum, row) => sum + row.total, 0);

    return [
      {
        label: 'Collection Rate',
        value: `${totals?.collectionRate.toFixed(1) ?? '0.0'}%`,
        helperText: `Outstanding balance ${this.formatCurrency(totals?.outstanding ?? 0)}`,
        icon: 'pi pi-percentage',
        tagLabel: this.workspace.selectedPeriodLabel(),
        severity: 'info',
        accentClass: 'bg-sky-100 text-sky-700'
      },
      {
        label: 'Paid Accounts',
        value: this.formatCount(this.paidCount()),
        helperText: `Exposure ${this.formatCurrency(paidExposure)}`,
        icon: 'pi pi-check-circle',
        tagLabel: 'Fully settled',
        severity: 'success',
        accentClass: 'bg-emerald-100 text-emerald-700'
      },
      {
        label: 'Partial Accounts',
        value: this.formatCount(this.partialCount()),
        helperText: `Exposure ${this.formatCurrency(partialExposure)}`,
        icon: 'pi pi-clock',
        tagLabel: 'Needs monitoring',
        severity: 'warn',
        accentClass: 'bg-amber-100 text-amber-700'
      },
      {
        label: 'Unpaid Accounts',
        value: this.formatCount(this.unpaidCount()),
        helperText: `Exposure ${this.formatCurrency(unpaidExposure)}`,
        icon: 'pi pi-times-circle',
        tagLabel: 'Highest follow-up',
        severity: 'danger',
        accentClass: 'bg-rose-100 text-rose-700'
      }
    ];
  });

  trackByCollectionAccount(_: number, row: DashboardCollectionRowView): string {
    return row.accountName;
  }

  private formatCount(value: number): string {
    return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(value);
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
