import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { DashboardWorkspaceService } from './dashboard-workspace.service';
import {
  DashboardHeaderComponent,
  DashboardHeaderNavItem
} from './components/dashboard-header/dashboard-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ProgressBarModule, SkeletonModule, TagModule, DashboardHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly workspace = inject(DashboardWorkspaceService);
  private readonly messageService = inject(MessageService);
  private wasLoading = false;
  readonly navItems: ReadonlyArray<DashboardHeaderNavItem> = [
    {
      label: 'Executive Summary',
      route: 'overview',
      icon: 'pi pi-home'
    },
    {
      label: 'Charts / Trends',
      route: 'sales-trend',
      icon: 'pi pi-chart-line'
    },
    {
      label: 'Branch Sales',
      route: 'branch-sales',
      icon: 'pi pi-sitemap'
    },
    {
      label: 'Volume Sales',
      route: 'volume-sales',
      icon: 'pi pi-gauge'
    },
    {
      label: 'Collection Report',
      route: 'collections',
      icon: 'pi pi-wallet'
    },
    {
      label: 'Variance Report',
      route: 'variance',
      icon: 'pi pi-sliders-h'
    }
  ];

  constructor() {
    effect(() => {
      const isLoading = this.workspace.isLoading();
      const hasData = this.workspace.hasData();
      const errorMessage = this.workspace.errorMessage();
      const selectedPeriod = this.workspace.selectedPeriodLabel();
      const overview = this.workspace.overview();
      const notice = this.workspace.notice();

      if (this.wasLoading && !isLoading && !errorMessage) {
        const severity = hasData
          ? overview?.sourceSeverity === 'warn'
            ? 'warn'
            : 'success'
          : overview?.sourceLabel === 'Unavailable'
            ? 'warn'
            : 'info';
        const summary = hasData
          ? overview?.sourceSeverity === 'warn'
            ? 'Report loaded with warnings'
            : 'Report loaded'
          : overview?.sourceLabel === 'Unavailable'
            ? 'Report unavailable'
            : 'Report finished';
        const detail = hasData
          ? `All available data for ${selectedPeriod} are loaded.`
          : overview?.sourceLabel === 'Unavailable'
            ? notice?.detail ?? 'Live report data is not available right now.'
            : `The report for ${selectedPeriod} finished loading, but no rows were returned.`;

        this.messageService.add({
          severity,
          summary,
          detail,
          life: 4500
        });
      }

      this.wasLoading = isLoading;
    });
  }
}
