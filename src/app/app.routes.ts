import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';

// Branch Sales
import { BranchSales } from './pages/dashboard/branch-sales/branch-sales';
import { BranchSalesMonthly } from './pages/dashboard/branch-sales/branch-sales-monthly/branch-sales-monthly';
import { BranchSalesYearly } from './pages/dashboard/branch-sales/branch-sales-yearly/branch-sales-yearly';

// Volume Sales
import { VolumeSales } from './pages/dashboard/volume-sales/volume-sales';
import { VolumeSalesMonthly } from './pages/dashboard/volume-sales/volume-sales-monthly/volume-sales-monthly';
import { VolumeSalesYearly } from './pages/dashboard/volume-sales/volume-sales-yearly/volume-sales-yearly';

// Driver Sales
import { DriverSales } from './pages/dashboard/driver-sales/driver-sales';
import { DriverSalesMonthly } from './pages/dashboard/driver-sales/driver-sales-monthly/driver-sales-monthly';
import { DriverSalesYearly } from './pages/dashboard/driver-sales/driver-sales-yearly/driver-sales-yearly';
import { MonthlyComparison } from './pages/dashboard/monthly-comparison/monthly-comparison';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    children: [
      {
        path: '',
        redirectTo: 'monthly-comparison',
        pathMatch: 'full'
      },
          /* ================= MONTHLY COMPARISON ================= */
      {
        path: 'monthly-comparison',
        component: MonthlyComparison
      },

      /* ================= BRANCH SALES ================= */
      {
        path: 'branch-sales',
        component: BranchSales,
        children: [
          { path: 'monthly', component: BranchSalesMonthly },
          { path: 'yearly', component: BranchSalesYearly },
          { path: '', redirectTo: 'monthly', pathMatch: 'full' }
        ]
      },

      /* ================= VOLUME SALES ================= */
      {
        path: 'volume-sales',
        component: VolumeSales,
        children: [
          { path: 'monthly', component: VolumeSalesMonthly },
          { path: 'yearly', component: VolumeSalesYearly },
          { path: '', redirectTo: 'monthly', pathMatch: 'full' }
        ]
      },

      /* ================= DRIVER SALES ================= */
      {
        path: 'driver-sales',
        component: DriverSales,
        children: [
          { path: 'monthly', component: DriverSalesMonthly },
          { path: 'yearly', component: DriverSalesYearly }, // add later
          { path: '', redirectTo: 'monthly', pathMatch: 'full' }
        ]
      }
    ]
  },

  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
