import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { computed } from '@angular/core';

import { DashboardBranchSalesRowView, DashboardSummaryCardView } from '../../../../models/dashboard.model';
import {
  branchPerformanceChartOptions,
  createBranchPerformanceChartData
} from '../../dashboard-chart.config';
import { DashboardWorkspaceService } from '../../../../services/dashboard-workspace.service';
import { SummaryCardComponent } from '../../components/summary-card/summary-card.component';

@Component({
  selector: 'app-dashboard-branch-sales-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, ChartModule, TableModule, TagModule, SummaryCardComponent],
  templateUrl: './dashboard-branch-sales-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardBranchSalesPageComponent {
  readonly workspace = inject(DashboardWorkspaceService);
  readonly branchChartData = computed(() =>
    createBranchPerformanceChartData(this.workspace.branchSalesRows())
  );
  readonly branchChartOptions = branchPerformanceChartOptions;
  readonly branchSummaryCards = computed<ReadonlyArray<DashboardSummaryCardView>>(() => {
    const rows = this.workspace.branchSalesRows();
    const topBranch = rows[0] ?? null;
    const collectedTotal = rows.reduce((sum, row) => sum + row.collected, 0);
    const outstandingTotal = rows.reduce((sum, row) => sum + row.balance, 0);

    return [
      {
        label: 'Branch Groups',
        value: this.formatCount(rows.length),
        helperText: 'Branch groups contributing to the active report',
        icon: 'pi pi-sitemap',
        tagLabel: this.workspace.selectedPeriodLabel(),
        severity: 'secondary',
        accentClass: 'bg-slate-100 text-slate-700'
      },
      {
        label: 'Top Branch',
        value: topBranch ? this.formatCurrency(topBranch.totalSales) : this.formatCurrency(0),
        helperText: topBranch?.branchName ?? 'No branch data available',
        icon: 'pi pi-arrow-up-right',
        tagLabel: topBranch ? 'Highest sales branch' : 'Awaiting data',
        severity: 'success',
        accentClass: 'bg-emerald-100 text-emerald-700'
      },
      {
        label: 'Collected',
        value: this.formatCurrency(collectedTotal),
        helperText: 'Collections captured across grouped branch sales',
        icon: 'pi pi-check-circle',
        tagLabel: this.workspace.collectionRateLabel(),
        severity: 'info',
        accentClass: 'bg-sky-100 text-sky-700'
      },
      {
        label: 'Outstanding',
        value: this.formatCurrency(outstandingTotal),
        helperText: 'Open balances that still require branch follow-up',
        icon: 'pi pi-briefcase',
        tagLabel: outstandingTotal > 0 ? 'Needs follow-up' : 'Cleared',
        severity: outstandingTotal > 0 ? 'warn' : 'success',
        accentClass: 'bg-amber-100 text-amber-700'
      }
    ];
  });

  getBranchExpansionIcon(expanded: boolean): string {
    return expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right';
  }

  trackByBranchId(_: number, row: DashboardBranchSalesRowView): number {
    return row.branchId;
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
