import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { DashboardTagSeverity } from '../../../../models/dashboard.model';
import { DashboardViewMode } from '../../../../services/dashboard.service';
import { DashboardReportExportService } from '../../dashboard-report-export.service';
import {
  DashboardReportModeOption,
  DashboardWorkspaceService
} from '../../dashboard-workspace.service';

export type DashboardHeaderNavItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    SelectModule,
    TagModule
  ],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHeaderComponent {
  private readonly workspace = inject(DashboardWorkspaceService);
  private readonly reportExportService = inject(DashboardReportExportService);
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit'
  });

  readonly navItems = input.required<ReadonlyArray<DashboardHeaderNavItem>>();
  readonly reportModeOptions: ReadonlyArray<DashboardReportModeOption> =
    this.workspace.reportModeButtons;
  readonly reportModeSelectOptions = [...this.reportModeOptions];
  readonly navigationItems = computed(() => [...this.navItems()]);
  readonly selectedReportMode = computed(() => this.workspace.reportMode());
  readonly selectedPeriodLabel = computed(() => this.workspace.selectedPeriodLabel());
  readonly previousPeriodLabel = computed(() => this.workspace.previousPeriodLabel());
  readonly nextPeriodLabel = computed(() => this.workspace.nextPeriodLabel());
  readonly snapshotRangeLabel = computed(() => this.workspace.reportWindow());
  readonly dataStatusDetail = computed(() => {
    if (this.workspace.isLoading()) {
      return 'Generating report. Large date ranges can take longer while live data is prepared.';
    }

    return this.workspace.notice()?.detail ?? this.navigationSummary();
  });
  readonly reportActionsDisabled = computed(
    () => this.workspace.isLoading() || Boolean(this.workspace.errorMessage()) || !this.workspace.hasData()
  );
  readonly sourceLabel = computed(() => {
    if (this.workspace.errorMessage()) {
      return 'Unavailable';
    }

    if (this.workspace.isLoading()) {
      return 'Loading';
    }

    return this.workspace.overview()?.sourceLabel ?? 'No response';
  });
  readonly sourceSeverity = computed<DashboardTagSeverity>(() => {
    if (this.workspace.errorMessage()) {
      return 'danger';
    }

    if (this.workspace.isLoading()) {
      return 'secondary';
    }

    return this.workspace.overview()?.sourceSeverity ?? 'warn';
  });
  readonly lastUpdatedLabel = computed(() => {
    const lastUpdatedAt = this.workspace.lastUpdatedAt();

    return lastUpdatedAt
      ? `Updated ${this.dateTimeFormatter.format(lastUpdatedAt)}`
      : 'Waiting for live data';
  });
  readonly navigationSummary = computed(() => {
    const reportModeLabel = this.selectedReportMode() === 'yearly' ? 'yearly' : 'monthly';

    return `${this.navigationItems().length} views ready for ${reportModeLabel} reporting`;
  });

  onReportModeChange(nextMode: DashboardViewMode | null): void {

    if (!nextMode) {
      return;
    }

    this.workspace.setReportMode(nextMode);
  }

  goToPreviousPeriod(): void {
    this.workspace.goToPreviousPeriod();
  }

  goToNextPeriod(): void {
    this.workspace.goToNextPeriod();
  }

  printCurrentReport(): void {
    if (this.reportActionsDisabled()) {
      return;
    }

    this.reportExportService.printCurrentReport();
  }

  async exportCurrentReportAsExcel(): Promise<void> {
    if (this.reportActionsDisabled()) {
      return;
    }

    await this.reportExportService.exportCurrentReportAsExcel();
  }

  trackByRoute(_: number, item: DashboardHeaderNavItem): string {
    return item.route;
  }
}
