import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartType } from 'chart.js';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

import mockData from '../../mock-dashboard-data.json';

/** Driver sale record (independent) */
type DriverSaleRow = {
  date: string; // YYYY-MM-DD
  driverId: string;
  name: string;
  volumeTons: number;
};

/** Monthly table row */
type TableRow = {
  driverId: string;
  name: string;
  totalVolume: number;
};

@Component({
  selector: 'app-driver-sales-monthly',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './driver-sales-monthly.html',
  styleUrls: ['../driver-sales.scss']
})
export class DriverSalesMonthly implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  currentYear = 2026;
  currentMonth = 1;

  monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
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
        title: { display: true, text: 'Daily Volume (MT)' },
        ticks: {
          callback: (v: any) => `${v} MT`
        }
      }
    }
  };

/** Monthly volume pie chart */
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
          const total = this.monthlyTotalVolume || 1;
          const percent = ((value / total) * 100).toFixed(1);
          return `${value.toFixed(2)} MT (${percent}%)`;
        }
      }
    }
  }
};


  /** Monthly summary table */
  tableRows: TableRow[] = [];
  monthlyTotalVolume = 0;

  ngOnInit(): void {
    this.loadForCurrentPeriod();
  }

  /* ================= NAVIGATION ================= */

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

  /* ================= CORE LOGIC ================= */

  private loadForCurrentPeriod() {
    const year = this.currentYear;
    const month = this.currentMonth;
    const daysInMonth = new Date(year, month, 0).getDate();

    const isInMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    };

    /** Unique drivers */
    const drivers = Array.from(
      new Map(
        this.allDriverRows.map(d => [d.driverId, d])
      ).values()
    );

    /** Build datasets: ONE DATASET PER DRIVER */
    const datasets = drivers.map((driver, i) => {
      const dailyData = Array(daysInMonth).fill(0);

      for (const r of this.allDriverRows) {
        if (
          r.driverId === driver.driverId &&
          isInMonth(r.date)
        ) {
          const day = new Date(r.date).getDate();
          dailyData[day - 1] += r.volumeTons;
        }
      }

      return {
        label: driver.name,
        data: dailyData,
        backgroundColor: this.getColor(i)
      };
    });

    this.chartData = {
      labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      datasets
    };

    /** Monthly table */
    const grouped: Record<string, TableRow> = {};
    this.monthlyTotalVolume = 0;

    for (const r of this.allDriverRows) {
      if (!isInMonth(r.date)) continue;

      if (!grouped[r.driverId]) {
        grouped[r.driverId] = {
          driverId: r.driverId,
          name: r.name,
          totalVolume: 0
        };
      }

      grouped[r.driverId].totalVolume += r.volumeTons;
      this.monthlyTotalVolume += r.volumeTons;
    }

    this.tableRows = Object.values(grouped)
      .sort((a, b) => b.totalVolume - a.totalVolume);

    queueMicrotask(() => this.chart?.update());
    /** ===========================
 * BUILD MONTHLY PIE CHART
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

    rows.push(['TOTAL', '', this.monthlyTotalVolume]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'Driver Monthly Volume');

    XLSX.writeFile(
      wb,
      `Driver_Volume_${this.monthNames[this.currentMonth - 1]}_${this.currentYear}.xlsx`
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
          <title>Driver Volume — ${this.monthNames[this.currentMonth - 1]} ${this.currentYear}</title>
          <style>
            table { width:100%; border-collapse: collapse; font-family: sans-serif; }
            th, td { border:1px solid #333; padding:8px; }
            th { background:#f3f4f6; }
          </style>
        </head>
        <body>
          <h2>Driver Volume — ${this.monthNames[this.currentMonth - 1]} ${this.currentYear}</h2>
          ${table.outerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  }
}
