import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartType } from 'chart.js';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

// Mock API data
import mockData from '../../mock-dashboard-data.json';

/** Backend-style daily record */
type DailyBranchRow = {
  date: string; // YYYY-MM-DD
  branch: string;
  cashSales: number;
  volumeTons: number;
};

/** Table row */
type TableRow = {
  month: string;
  branches: Record<string, number>;
  monthlyTotal: number;
};

@Component({
  selector: 'app-volume-sales-yearly',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './volume-sales-yearly.html',
  styleUrls: ['../volume-sales.scss']
})
export class VolumeSalesYearly implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  currentYear = 2026;

  monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  /** Branch list */
  branches: string[] = (mockData as any).meta.branches || [];

  /** Raw API rows */
  allDailyRows: DailyBranchRow[] =
    (mockData as any).branchSales || [];

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
            `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} tons`
        }
      }
    },
    scales: {
      y: {
        title: { display: true, text: 'Volume (tons)' },
        ticks: {
          callback: (v: any) => `${v} t`
        }
      }
    }
  };
  /** Yearly volume pie chart */
pieChartData: any = {
  labels: [],
  datasets: []
};

pieChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const value = ctx.raw;
          const total = this.yearlyGrandTotal || 1;
          const percent = ((value / total) * 100).toFixed(1);
          return `${value.toFixed(2)} MT (${percent}%)`;
        }
      }
    }
  }
};


  tableRows: TableRow[] = [];
  yearlyBranchTotals: Record<string, number> = {};
  yearlyGrandTotal = 0;

  ngOnInit(): void {
    this.loadForCurrentYear();
  }

  /* ================= NAVIGATION ================= */

  prevYear() {
    this.currentYear--;
    this.loadForCurrentYear();
  }

  nextYear() {
    this.currentYear++;
    this.loadForCurrentYear();
  }

  /* ================= CORE LOGIC ================= */

  private loadForCurrentYear() {
    const year = this.currentYear;

    const isInYear = (dateStr: string) =>
      new Date(dateStr).getFullYear() === year;

    const labels = this.monthNames;

    const datasets = this.branches.map((branch, i) => {
      const data = Array(12).fill(0);

      for (const r of this.allDailyRows) {
        if (isInYear(r.date) && r.branch === branch) {
          const m = new Date(r.date).getMonth();
          data[m] += r.volumeTons;
        }
      }

      return {
        label: branch,
        data,
        backgroundColor: this.getColor(i)
      };
    });

    this.chartData = { labels, datasets };

    // Reset totals
    this.yearlyBranchTotals = {};
    this.branches.forEach(b => (this.yearlyBranchTotals[b] = 0));
    this.yearlyGrandTotal = 0;

    // Build table
    this.tableRows = this.monthNames.map((month, i) => {
      const branchValues: Record<string, number> = {};
      let monthlyTotal = 0;

      for (const ds of datasets) {
        const value = ds.data[i] ?? 0;
        branchValues[ds.label] = value;
        monthlyTotal += value;
        this.yearlyBranchTotals[ds.label] += value;
      }

      this.yearlyGrandTotal += monthlyTotal;

      return {
        month,
        branches: branchValues,
        monthlyTotal
      };
    });

    queueMicrotask(() => this.chart?.update());
    /** ===========================
 * BUILD YEARLY VOLUME PIE
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

  /* ================= HELPERS ================= */

  private getColor(i: number): string {
    const colors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'];
    return colors[i % colors.length];
  }

  formatVolume(v: number): string {
    return `${v.toFixed(2)} MT`;
  }

  /* ================= EXPORT ================= */

  exportToExcel() {
    const rows: any[] = [];

    rows.push(['Month', ...this.branches, 'Monthly Total (MT)']);

    for (const row of this.tableRows) {
      rows.push([
        row.month,
        ...this.branches.map(b => row.branches[b]),
        row.monthlyTotal
      ]);
    }

    rows.push([
      'TOTAL',
      ...this.branches.map(b => this.yearlyBranchTotals[b]),
      this.yearlyGrandTotal
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'Yearly Volume Sales');

    XLSX.writeFile(
      wb,
      `Volume_Sales_${this.currentYear}.xlsx`
    );
  }

  /* ================= PRINT ================= */

  printTable() {
    const table = document.getElementById('volume-sales-yearly-table');
    if (!table) return;

    const win = window.open('', '_blank', 'width=1000,height=700');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Volume Sales — ${this.currentYear}</title>
          <style>
            table { width:100%; border-collapse: collapse; font-family: sans-serif; }
            th, td { border:1px solid #333; padding:8px; text-align:right; }
            th { background:#f3f4f6; text-align:left; }
          </style>
        </head>
        <body>
          <h2>Volume Sales — ${this.currentYear}</h2>
          ${table.outerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  }
}
