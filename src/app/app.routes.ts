import { Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DashboardBranchSalesPageComponent } from './pages/dashboard/reports/dashboard-branch-sales-page.component';
import { DashboardCollectionsPageComponent } from './pages/dashboard/reports/dashboard-collections-page.component';
import { DashboardOverviewPageComponent } from './pages/dashboard/reports/dashboard-overview-page.component';
import { DashboardTrendPageComponent } from './pages/dashboard/reports/dashboard-trend-page.component';
import { DashboardVariancePageComponent } from './pages/dashboard/reports/dashboard-variance-page.component';
import { DashboardVolumeSalesPageComponent } from './pages/dashboard/reports/dashboard-volume-sales-page.component';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: DashboardOverviewPageComponent },
      { path: 'sales-trend', component: DashboardTrendPageComponent },
      { path: 'branch-sales', component: DashboardBranchSalesPageComponent },
      { path: 'volume-sales', component: DashboardVolumeSalesPageComponent },
      { path: 'collections', component: DashboardCollectionsPageComponent },
      { path: 'variance', component: DashboardVariancePageComponent }
    ]
  },

  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
