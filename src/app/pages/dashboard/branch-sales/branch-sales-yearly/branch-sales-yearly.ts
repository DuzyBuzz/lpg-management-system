import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartType } from 'chart.js';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

import mockData from '../../mock-dashboard-data.json';

type DailyBranchRow = {
  date: string;          // YYYY-MM-DD
  branch: string;
  cashSales: number;
  volumeTons: number;
};

type TableRow = {
  month: string;         // YYYY-MM
  branches: Record<string, number>;
  monthlyTotal: number;
};

@Component({
  selector: 'app-branch-sales-yearly',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './branch-sales-yearly.html',
  styleUrls: ['../branch-sales.scss']
})
export class BranchSalesYearly implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  currentYear = 2026;

  monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  branches: string[] = (mockData as any).meta.branches || [];
  allRows: DailyBranchRow[] =
    (mockData as any).branchSales || (mockData as any).dailyBranchSales || [];

  chartType: ChartType = 'bar';
  chartData: any = { labels: [], datasets: [] };

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx: any) =>
            `${ctx.dataset.label}: ₱${Number(ctx.raw).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        title: { display: true, text: 'Cash Sales (PHP)' },
        ticks: {
          callback: (v: any) => '₱' + Number(v).toLocaleString()
        }
      }
    }
  };

  tableRows: TableRow[] = [];
  yearlyBranchTotals: Record<string, number> = {};
  yearlyGrandTotal = 0;

  ngOnInit(): void {
    this.loadYear();
  }

  prevYear() {
    this.currentYear--;
    this.loadYear();
  }

  nextYear() {
    this.currentYear++;
    this.loadYear();
  }

  /* ===========================
     CORE YEARLY LOGIC
     =========================== */

  private loadYear() {
    const year = this.currentYear;

    const isInYear = (dateStr: string) =>
      new Date(dateStr).getFullYear() === year;

    // index: branch-month → total
    const index: Record<string, number> = {};

    for (const r of this.allRows) {
      if (isInYear(r.date)) {
        const d = new Date(r.date);
        const month = d.getMonth(); // 0–11
        const key = `${r.branch}-${month}`;
        index[key] = (index[key] || 0) + r.cashSales;
      }
    }

    const labels = this.monthNames;

    const datasets = this.branches.map((branch, i) => ({
      label: branch,
      data: labels.map((_, m) => index[`${branch}-${m}`] ?? 0),
      backgroundColor: this.getColor(i)
    }));

    this.chartData = { labels, datasets };

    // totals
    this.yearlyBranchTotals = {};
    this.branches.forEach(b => (this.yearlyBranchTotals[b] = 0));
    this.yearlyGrandTotal = 0;

    this.tableRows = labels.map((_, m) => {
      const branchValues: Record<string, number> = {};
      let monthlyTotal = 0;

      for (const ds of datasets) {
        const value = ds.data[m];
        branchValues[ds.label] = value;
        monthlyTotal += value;
        this.yearlyBranchTotals[ds.label] += value;
      }

      this.yearlyGrandTotal += monthlyTotal;

      return {
        month: `${year}-${String(m + 1).padStart(2, '0')}`,
        branches: branchValues,
        monthlyTotal
      };
    });

    queueMicrotask(() => this.chart?.update());
    /** ===========================
 * BUILD PIE CHART (YEARLY)
 * =========================== */
this.pieChartData = {
  labels: this.branches,
  datasets: [
    {
      data: this.branches.map(
        b => this.yearlyBranchTotals[b] || 0
      ),
      backgroundColor: this.branches.map(
        (_, i) => this.getColor(i)
      ),
      borderWidth: 1
    }
  ]
};

  }
  

  private getColor(i: number): string {
    const colors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'];
    return colors[i % colors.length];
  }

  formatCurrency(v: number): string {
    return '₱' + Math.round(v).toLocaleString();
  }



/** Pie chart (yearly distribution) */
pieChartData: any = {
  labels: [],
  datasets: []
};

pieChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const value = ctx.raw;
          const total = this.yearlyGrandTotal || 1;
          const percent = ((value / total) * 100).toFixed(1);
          return `₱${value.toLocaleString()} (${percent}%)`;
        }
      }
    }
  }
};


  /* ===========================
     EXPORT
     =========================== */

  exportToExcel() {
    const rows: any[] = [];

    rows.push(['Month', ...this.branches, 'Monthly Total']);

    for (const r of this.tableRows) {
      rows.push([
        r.month,
        ...this.branches.map(b => r.branches[b]),
        r.monthlyTotal
      ]);
    }

    rows.push([
      'TOTAL',
      ...this.branches.map(b => this.yearlyBranchTotals[b]),
      this.yearlyGrandTotal
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yearly Branch Sales');

    XLSX.writeFile(wb, `Branch_Sales_${this.currentYear}.xlsx`);
  }

  printTable() {
    const table = document.getElementById('branch-sales-table');
    if (!table) return;

    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Branch Sales — ${this.currentYear}</title>
          <style>
            table { width:100%; border-collapse: collapse; }
            th, td { border:1px solid #333; padding:8px; text-align:right; }
            th { background:#f3f4f6; text-align:left; }
          </style>
        </head>
        <body>
          <h2>Branch Sales — ${this.currentYear}</h2>
          ${table.outerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  }
}
