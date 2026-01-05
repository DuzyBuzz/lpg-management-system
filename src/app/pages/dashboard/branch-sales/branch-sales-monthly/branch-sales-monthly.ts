import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartType } from 'chart.js';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

import mockData from '../../mock-dashboard-data.json';

/**
 * Daily per-branch sales record
 * Backend-style: date only (YYYY-MM-DD)
 */
type DailyBranchRow = {
  date: string; // ISO date string
  branch: string;
  cashSales: number;
  volumeTons: number;
};

/**
 * Table row shown under the chart
 */
type TableRow = {
  date: string;
  branches: Record<string, number>;
  dailyTotal: number;
};

@Component({
  selector: 'app-branch-sales-monthly',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './branch-sales-monthly.html',
  styleUrls: ['../branch-sales.scss']
})
export class BranchSalesMonthly implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  currentYear = 2026;
  currentMonth = 1;

  monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  /** Branch list from API/meta */
  branches: string[] = (mockData as any).meta.branches || [];

  /** Raw daily rows from API */
  allDailyRows: DailyBranchRow[] =
    (mockData as any).branchSales || (mockData as any).dailyBranchSales || [];

  chartType: ChartType = 'bar';
  chartData: any = { labels: [], datasets: [] };

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
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
            const total = this.monthlyGrandTotal || 1;
            const percent = ((value / total) * 100).toFixed(1);
            return `₱${value.toLocaleString()} (${percent}%)`;
          }
        }
      }
    }
  };

  tableRows: TableRow[] = [];
  monthlyBranchTotals: Record<string, number> = {};
  monthlyGrandTotal = 0;

  ngOnInit(): void {
    this.loadForCurrentPeriod();
  }

  /* ===========================
     NAVIGATION
     =========================== */

  prevMonth() {
    this.currentMonth === 1
      ? (this.currentMonth = 12, this.currentYear--)
      : this.currentMonth--;
    this.loadForCurrentPeriod();
  }

  nextMonth() {
    this.currentMonth === 12
      ? (this.currentMonth = 1, this.currentYear++)
      : this.currentMonth++;
    this.loadForCurrentPeriod();
  }

  prevYear() {
    this.currentYear--;
    this.loadForCurrentPeriod();
  }

  nextYear() {
    this.currentYear++;
    this.loadForCurrentPeriod();
  }

  /* ===========================
     CORE LOGIC (DATE-BASED)
     =========================== */

  private loadForCurrentPeriod() {
    const year = this.currentYear;
    const month = this.currentMonth;

    const daysInMonth = new Date(year, month, 0).getDate();

    /**
     * Helper: check if a record belongs to the current month
     */
    const isInCurrentMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    };

    /**
     * Index records by branch + day (fast lookup)
     */
    const index: Record<string, DailyBranchRow> = {};
    for (const r of this.allDailyRows) {
      if (isInCurrentMonth(r.date)) {
        const day = new Date(r.date).getDate();
        index[`${r.branch}-${day}`] = r;
      }
    }

    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    /**
     * Build chart datasets (one bar set per branch)
     */
    const datasets = this.branches.map((branch, i) => {
      const data: number[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        data.push(index[`${branch}-${day}`]?.cashSales ?? 0);
      }

      return {
        label: branch,
        data,
        backgroundColor: this.getColor(i)
      };
    });

    this.chartData = { labels, datasets };

    /**
     * Reset totals
     */
    this.monthlyBranchTotals = {};
    this.branches.forEach(b => (this.monthlyBranchTotals[b] = 0));
    this.monthlyGrandTotal = 0;

    /**
     * Build table rows + totals
     */
    this.tableRows = labels.map((day, i) => {
      const branchValues: Record<string, number> = {};
      let dailyTotal = 0;

      for (const ds of datasets) {
        const value = ds.data[i] ?? 0;
        branchValues[ds.label] = value;
        dailyTotal += value;
        this.monthlyBranchTotals[ds.label] += value;
      }

      this.monthlyGrandTotal += dailyTotal;

      const paddedDay = String(day).padStart(2, '0');
      const paddedMonth = String(month).padStart(2, '0');

      return {
        date: `${year}-${paddedMonth}-${paddedDay}`,
        branches: branchValues,
        dailyTotal
      };
    });

    queueMicrotask(() => this.chart?.update());
    /** ===========================
 * BUILD MONTHLY PIE CHART
 * =========================== */
this.pieChartData = {
  labels: this.branches,
  datasets: [
    {
      data: this.branches.map(
        b => this.monthlyBranchTotals[b] || 0
      ),
      backgroundColor: this.branches.map(
        (_, i) => this.getColor(i)
      ),
      borderWidth: 1
    }
  ]
};

  }

  /* ===========================
     HELPERS
     =========================== */

  private getColor(i: number): string {
    const colors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'];
    return colors[i % colors.length];
  }

  formatCurrency(v: number): string {
    return '₱' + Math.round(v).toLocaleString();
  }

  /* ===========================
     EXPORT TO EXCEL
     =========================== */

  exportToExcel() {
    const rows: any[] = [];

    rows.push(['Date', ...this.branches, 'Daily Total']);

    for (const row of this.tableRows) {
      rows.push([
        row.date,
        ...this.branches.map(b => row.branches[b]),
        row.dailyTotal
      ]);
    }

    rows.push([
      'TOTAL',
      ...this.branches.map(b => this.monthlyBranchTotals[b]),
      this.monthlyGrandTotal
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Branch Sales');

    XLSX.writeFile(
      workbook,
      `Branch_Sales_${this.monthNames[this.currentMonth - 1]}_${this.currentYear}.xlsx`
    );
  }

  /* ===========================
     PRINT
     =========================== */

  printTable() {
    const table = document.getElementById('branch-sales-table');
    if (!table) return;

    const win = window.open('', '_blank', 'width=1000,height=700');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Branch Sales — ${this.monthNames[this.currentMonth - 1]} ${this.currentYear}</title>
          <style>
            table { width:100%; border-collapse: collapse; font-family: sans-serif; }
            th, td { border:1px solid #333; padding:8px; text-align:right; }
            th { background:#f3f4f6; text-align:left; }
          </style>
        </head>
        <body>
          <h2>Branch Sales — ${this.monthNames[this.currentMonth - 1]} ${this.currentYear}</h2>
          ${table.outerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  }
}
