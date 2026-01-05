import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ViewChild } from '@angular/core';


import {
  Chart,
  registerables,
  ChartOptions,
  ChartType,
  ChartData
} from 'chart.js';

// register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-gasul',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './gasul.html',
  styleUrls: ['./gasul.scss'],
})
export class Gasul {
  public readonly snapshotPeriod = 'January 2026';
@ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // --- Branch Metrics ---
  branchMetrics = [
    { label: 'Total Cash Sales (January 2026)', value: '₱14,953,800', change: '+12.0%', icon: '' },
    { label: 'Metric Tonne (t/MT) (January 2026)', value: '4,120 tons', change: '+8.4%', icon: '' }
  ];
updateDailySalesChart() {
  const labels = Array.from({ length: 31 }, (_, i) => `Jan ${i + 1}`);
  let values: number[] = [];

  if (this.selectedBranch === 'All') {
    // SUM of all branches per day
    for (let day = 1; day <= 31; day++) {
      const sum = this.dailySalesAllBranches
        .filter(d => d.dayNum === day)
        .reduce((s, r) => s + r.sales, 0);
      values.push(sum);
    }
  } else {
    // SINGLE branch values
    values = this.dailySalesAllBranches
      .filter(d => d.branch === this.selectedBranch)
      .sort((a, b) => a.dayNum - b.dayNum)
      .map(r => r.sales);
  }

  // 🔥 Assign new references (important!)
  this.dailySalesChartData = {
    labels,
    datasets: [
      {
        ...this.dailySalesChartData.datasets[0],
        data: values
      }
    ]
  };

  // 🔥 Force redraw
  this.chart?.update();
}

  // --- Branch filter ---
  branches = ['All', 'Molo', 'Oton', 'Sooc', 'Guimbal', 'Antique'];
  selectedBranch = 'All';

  // --- DAILY SALES (FULL JAN 2026 – ALL BRANCHES) ---
  dailySalesAllBranches = this.generateJanuarySales(); // deterministic
  dailySalesFluctuation = [...this.dailySalesAllBranches];

  // --- CHART (ng2-charts / Chart.js) ---
public dailyChartType: 'line' = 'line';


  public dailySalesChartData: ChartData<'line'> = {
    labels: [], // will be set by updateDailySalesChart()
    datasets: [
      {
        label: 'Daily Cash Sales (₱)',
        data: [], // values set by updateDailySalesChart()
        fill: false,
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  public dailySalesChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            // Chart.js v4 passes context.parsed which may be number or object {x,y}
            const parsed = context.parsed;
            const value = parsed && typeof parsed === 'object' ? parsed.y : parsed;
            return `₱${this.formatNumber(Number(value))}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#e5e7eb' },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12
        }
      },
      y: {
        grid: { color: '#e5e7eb' },
        ticks: {
          callback: (value: any) => `₱${this.formatNumber(Number(value))}`
        }
      }
    }
  };

  // --- MONTHLY CASH SALES (unchanged) ---
  monthlyCashSales = [
    { monthShort: 'Jan', monthFull: 'Jan 2026', sales: 1245600 },
    { monthShort: 'Feb', monthFull: 'Feb 2026', sales: 1180400 },
    { monthShort: 'Mar', monthFull: 'Mar 2026', sales: 1150000 },
    { monthShort: 'Apr', monthFull: 'Apr 2026', sales: 1300500 },
    { monthShort: 'May', monthFull: 'May 2026', sales: 1220300 },
    { monthShort: 'Jun', monthFull: 'Jun 2026', sales: 1335000 },
    { monthShort: 'Jul', monthFull: 'Jul 2026', sales: 1210000 },
    { monthShort: 'Aug', monthFull: 'Aug 2026', sales: 1275400 },
    { monthShort: 'Sep', monthFull: 'Sep 2026', sales: 1160800 },
    { monthShort: 'Oct', monthFull: 'Oct 2026', sales: 1295600 },
    { monthShort: 'Nov', monthFull: 'Nov 2026', sales: 1180200 },
    { monthShort: 'Dec', monthFull: 'Dec 2026', sales: 1400000 }
  ];

  // --- Other static data (unchanged) ---
  branchPerformanceData = [
    { branch: 'Molo', cashSales: '₱245,600', volumeConsumption: 68 },
    { branch: 'Oton', cashSales: '₱198,400', volumeConsumption: 55 },
    { branch: 'Sooc', cashSales: '₱156,800', volumeConsumption: 44 },
    { branch: 'Guimbal', cashSales: '₱234,500', volumeConsumption: 65 },
    { branch: 'Antique', cashSales: '₱210,300', volumeConsumption: 58 }
  ];

  branchDistributionData = [
    { branch: 'Molo', percentage: 28, sales: '₱245,600', color: '#3b82f6' },
    { branch: 'Oton', percentage: 18, sales: '₱198,400', color: '#8b5cf6' },
    { branch: 'Sooc', percentage: 14, sales: '₱156,800', color: '#06b6d4' },
    { branch: 'Guimbal', percentage: 22, sales: '₱234,500', color: '#10b981' },
    { branch: 'Antique', percentage: 18, sales: '₱210,300', color: '#f59e0b' }
  ];

  unattachedDrivers = [
    { driverId: 'DRV-001', name: 'John Martinez', cashSales: '₱28,500', volumeTons: 8 },
    { driverId: 'DRV-002', name: 'Carlos Reyes', cashSales: '₱32,200', volumeTons: 9 },
    { driverId: 'DRV-003', name: 'Miguel Santos', cashSales: '₱25,800', volumeTons: 7 },
    { driverId: 'DRV-004', name: 'Roberto Garcia', cashSales: '₱31,100', volumeTons: 9 }
  ];

  Math = Math;

  constructor() {
    // populate initial chart
    this.updateDailySalesChart();
  }

  // ---------------------------
  // FILTER HANDLER
  // ---------------------------
  onBranchChange(branch: string) {
    this.selectedBranch = branch;
    this.dailySalesFluctuation =
      branch === 'All'
        ? [...this.dailySalesAllBranches]
        : this.dailySalesAllBranches.filter(d => d.branch === branch);

    this.updateDailySalesChart();
  }

  // ---------------------------
  // CHART UPDATE
  // ---------------------------
  // updateDailySalesChart() {
  //   const labels = Array.from({ length: 31 }, (_, i) => `Jan ${i + 1}`);
  //   let values: number[] = [];

  //   if (this.selectedBranch === 'All') {
  //     // aggregate sum across branches per day
  //     for (let day = 1; day <= 31; day++) {
  //       const sum = this.dailySalesAllBranches
  //         .filter(d => d.dayNum === day)
  //         .reduce((s, r) => s + r.sales, 0);
  //       values.push(sum);
  //     }
  //   } else {
  //     // per-branch values sorted by day
  //     const rows = this.dailySalesAllBranches
  //       .filter(d => d.branch === this.selectedBranch)
  //       .sort((a, b) => a.dayNum - b.dayNum);
  //     values = rows.map(r => r.sales);
  //   }

  //   this.dailySalesChartData.labels = labels;
  //   this.dailySalesChartData.datasets[0].data = values;
  // }

  // ---------------------------
  // UTILITIES
  // ---------------------------
  private formatNumber(v: number | undefined): string {
    if (v == null) return '0';
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  // ---------------------------
  // DETERMINISTIC JANUARY DATA GENERATOR
  // ---------------------------
  private generateJanuarySales() {
    const configs: Record<string, { base: number; amp: number; phase: number }> = {
      Molo: { base: 60000, amp: 9000, phase: 0 },
      Oton: { base: 52000, amp: 7000, phase: 1 },
      Sooc: { base: 48000, amp: 6000, phase: 2 },
      Guimbal: { base: 65000, amp: 10000, phase: 3 },
      Antique: { base: 55000, amp: 8000, phase: 4 }
    };

    const result: Array<{ branch: string; day: string; dayNum: number; sales: number; trend: 'up' | 'down' }> = [];

    for (const branch of Object.keys(configs)) {
      const cfg = configs[branch];
      let prev = cfg.base;

      for (let day = 1; day <= 31; day++) {
        const seasonal = Math.round(Math.sin((day + cfg.phase) / 3) * cfg.amp);
        const weekly = Math.round(Math.cos((day + cfg.phase) / 7) * (cfg.amp / 3));
        const trendBias = Math.round((day - 15) * (cfg.amp / 80));
        const sales = Math.max(30000, Math.round(cfg.base + seasonal + weekly + trendBias));
        const trend = sales >= prev ? 'up' : 'down';

        result.push({
          branch,
          day: `Jan ${day}, 2026`,
          dayNum: day,
          sales,
          trend
        });

        prev = sales;
      }
    }

    return result;
  }

  // --- PIE helpers (unchanged) ---
  getPieSlice(percentage: number, startAngle: number, radius: number = 80): string {
    const endAngle = startAngle + (percentage / 100) * 360;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const cx = 100;
    const cy = 100;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  getBranchAngle(index: number): number {
    return this.branchDistributionData
      .slice(0, index)
      .reduce((sum, item) => sum + (item.percentage / 100) * 360, 0);
  }
}
