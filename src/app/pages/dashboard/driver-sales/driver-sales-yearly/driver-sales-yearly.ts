import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartType } from 'chart.js';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

import mockData from '../../mock-dashboard-data.json';

/** Driver sale record (independent, API-style) */
type DriverSaleRow = {
  date: string; // YYYY-MM-DD
  driverId: string;
  name: string;
  volumeTons: number;
};

/** Table row */
type TableRow = {
  driverId: string;
  name: string;
  totalVolume: number;
};

@Component({
  selector: 'app-driver-sales-yearly',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './driver-sales-yearly.html',
  styleUrls: ['../driver-sales.scss']
})
export class DriverSalesYearly implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  currentYear = 2026;

  monthNames = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec'
  ];

  allDriverRows: DriverSaleRow[] =
    (mockData as any).driverSales || [];

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
            `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} MT`
        }
      }
    },
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        title: { display: true, text: 'Monthly Volume (MT)' },
        ticks: {
          callback: (v: any) => `${v} MT`
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
          const total = this.yearlyTotalVolume || 1;
          const percent = ((value / total) * 100).toFixed(1);
          return `${value.toFixed(2)} MT (${percent}%)`;
        }
      }
    }
  }
};

  tableRows: TableRow[] = [];
  yearlyTotalVolume = 0;

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

    /** Unique drivers */
    const drivers = Array.from(
      new Map(this.allDriverRows.map(d => [d.driverId, d])).values()
    );

    /** Build stacked datasets (per driver, per month) */
    const datasets = drivers.map((driver, i) => {
      const monthlyData = Array(12).fill(0);

      for (const r of this.allDriverRows) {
        if (r.driverId === driver.driverId && isInYear(r.date)) {
          const month = new Date(r.date).getMonth();
          monthlyData[month] += r.volumeTons;
        }
      }

      return {
        label: driver.name,
        data: monthlyData,
        backgroundColor: this.getColor(i)
      };
    });

    this.chartData = {
      labels: this.monthNames,
      datasets
    };

    /** Table totals */
    const grouped: Record<string, TableRow> = {};
    this.yearlyTotalVolume = 0;

    for (const r of this.allDriverRows) {
      if (!isInYear(r.date)) continue;

      if (!grouped[r.driverId]) {
        grouped[r.driverId] = {
          driverId: r.driverId,
          name: r.name,
          totalVolume: 0
        };
      }

      grouped[r.driverId].totalVolume += r.volumeTons;
      this.yearlyTotalVolume += r.volumeTons;
    }

    this.tableRows = Object.values(grouped)
      .sort((a, b) => b.totalVolume - a.totalVolume);

    queueMicrotask(() => this.chart?.update());
    /** ===========================
 * BUILD YEARLY PIE CHART
 * =========================== */
this.pieChartData = {
  labels: this.tableRows.map(r => r.name),
  datasets: [
    {
      data: this.tableRows.map(r => r.totalVolume),
      backgroundColor: this.tableRows.map(
        (_, i) => this.getColor(i)
      ),
      borderWidth: 1
    }
  ]
};

  }

  /* ================= HELPERS ================= */

  private getColor(i: number): string {
    const colors = [
      '#10b981', // green
      '#3b82f6', // blue
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#ef4444', // red
      '#06b6d4'  // cyan
    ];
    return colors[i % colors.length];
  }

  formatVolume(v: number): string {
    return `${v.toFixed(2)} MT`;
  }

  /* ================= EXPORT ================= */

  exportToExcel() {
    const rows: any[] = [];

    rows.push(['Driver ID', 'Driver Name', 'Total Volume (MT)']);

    for (const r of this.tableRows) {
      rows.push([r.driverId, r.name, r.totalVolume]);
    }

    rows.push(['TOTAL', '', this.yearlyTotalVolume]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'Driver Yearly Volume');

    XLSX.writeFile(
      wb,
      `Driver_Volume_${this.currentYear}.xlsx`
    );
  }

  /* ================= PRINT ================= */

  printTable() {
    const table = document.getElementById('driver-sales-table');
    if (!table) return;

    const win = window.open('', '_blank', 'width=1000,height=700');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Driver Volume — ${this.currentYear}</title>
          <style>
            table { width:100%; border-collapse: collapse; font-family: sans-serif; }
            th, td { border:1px solid #333; padding:8px; }
            th { background:#f3f4f6; }
          </style>
        </head>
        <body>
          <h2>Driver Volume — ${this.currentYear}</h2>
          ${table.outerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  }
}
