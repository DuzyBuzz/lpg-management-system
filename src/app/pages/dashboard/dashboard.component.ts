import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
}
