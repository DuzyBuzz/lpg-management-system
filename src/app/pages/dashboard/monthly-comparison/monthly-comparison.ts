import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartType, registerables } from 'chart.js';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

import mockData from '../mock-dashboard-data.json';

type DailyBranchRow = {
  date: string;
  branch: string;
  cashSales: number;
  volumeTons: number;
};

/** Table row model */
type ComparisonRow = {
  branch: string;
  prevCash: number;
  prevVolume: number;
  currCash: number;
  currVolume: number;
  nextCash: number;
  nextVolume: number;
};

@Component({
  selector: 'app-monthly-comparison',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './monthly-comparison.html',
  styleUrls: ['./monthly-comparison.scss']
})
export class MonthlyComparison implements OnInit {
  @ViewChild('prevChart') prevChart?: BaseChartDirective;
  @ViewChild('currentChart') currentChart?: BaseChartDirective;
  @ViewChild('nextChart') nextChart?: BaseChartDirective;

  currentYear = 2026;
  currentMonth = 0; // January (0-based)

  monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  branches: string[] = (mockData as any).meta.branches || [];
  rows: DailyBranchRow[] = (mockData as any).branchSales || [];

  chartType: ChartType = 'bar';

  prevData: any = {};
  currentData: any = {};
  nextData: any = {};

  /** Table rows */
  tableRows: ComparisonRow[] = [];

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    },
    scales: {
      y: {
        title: { display: true, text: 'Cash Sales (PHP)' },
        ticks: {
          callback: (v: any) => '₱' + Number(v).toLocaleString()
        }
      },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Volume (MT)' },
        ticks: {
          callback: (v: any) => `${v} MT`
        }
      }
    }
  };

  ngOnInit(): void {
    this.reload();
  }

  /* ================= NAVIGATION ================= */

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.reload();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.reload();
  }

  prevYear() {
    this.currentYear--;
    this.reload();
  }

  nextYear() {
    this.currentYear++;
    this.reload();
  }

  /* ================= CORE ================= */

  private reload() {
    const prev = this.buildMonthTotals(this.currentYear - 1);
    const curr = this.buildMonthTotals(this.currentYear);
    const next = this.buildMonthTotals(this.currentYear + 1);

    this.prevData = prev.chart;
    this.currentData = curr.chart;
    this.nextData = next.chart;

    /** Build comparison table */
    this.tableRows = this.branches.map(branch => ({
      branch,
      prevCash: prev.cash[branch],
      prevVolume: prev.volume[branch],
      currCash: curr.cash[branch],
      currVolume: curr.volume[branch],
      nextCash: next.cash[branch],
      nextVolume: next.volume[branch]
    }));

    queueMicrotask(() => {
      this.prevChart?.update();
      this.currentChart?.update();
      this.nextChart?.update();
    });
  }

  /**
   * Build TOTALS for ONE MONTH of a given year
   */
  private buildMonthTotals(year: number) {
    const cashTotals: Record<string, number> = {};
    const volumeTotals: Record<string, number> = {};

    this.branches.forEach(b => {
      cashTotals[b] = 0;
      volumeTotals[b] = 0;
    });

    for (const r of this.rows) {
      const d = new Date(r.date);
      if (d.getFullYear() === year && d.getMonth() === this.currentMonth) {
        cashTotals[r.branch] += r.cashSales;
        volumeTotals[r.branch] += r.volumeTons;
      }
    }

    return {
      cash: cashTotals,
      volume: volumeTotals,
      chart: {
        labels: this.branches,
        datasets: [
          {
            type: 'line',
            label: 'Volume (MT)',
            data: this.branches.map(b => volumeTotals[b]),
            borderColor: '#111827',
            backgroundColor: '#111827',
            yAxisID: 'y1',
            tension: 0.3,
            pointRadius: 4,
            order: 1
          },
          {
            type: 'bar',
            label: 'Cash Sales (₱)',
            data: this.branches.map(b => cashTotals[b]),
            backgroundColor: this.branches.map((_, i) => this.getColor(i)),
            yAxisID: 'y',
            order: 2
          }
        ]
      }
    };
  }

  private getColor(i: number): string {
    const colors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'];
    return colors[i % colors.length];
  }

  formatCurrency(v: number): string {
    return '₱' + Math.round(v).toLocaleString();
  }

  formatVolume(v: number): string {
    return `${v.toFixed(2)} MT`;
  }

  /* ================= EXPORT ================= */

  exportToExcel() {
    const rows: any[] = [];

    rows.push([
      'Branch',
      `${this.currentYear - 1} Cash`,
      `${this.currentYear - 1} MT`,
      `${this.currentYear} Cash`,
      `${this.currentYear} MT`,
      `${this.currentYear + 1} Cash`,
      `${this.currentYear + 1} MT`
    ]);

    for (const r of this.tableRows) {
      rows.push([
        r.branch,
        r.prevCash,
        r.prevVolume,
        r.currCash,
        r.currVolume,
        r.nextCash,
        r.nextVolume
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Comparison');

    XLSX.writeFile(
      wb,
      `Monthly_Comparison_${this.monthNames[this.currentMonth]}_${this.currentYear}.xlsx`
    );
  }

  /* ================= PRINT ================= */

  printTable() {
    const table = document.getElementById('monthly-comparison-table');
    if (!table) return;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Monthly Comparison</title>
          <style>
            table { width:100%; border-collapse: collapse; font-family: sans-serif; }
            th, td { border:1px solid #333; padding:8px; text-align:right; }
            th { background:#f3f4f6; }
            td:first-child, th:first-child { text-align:left; }
          </style>
        </head>
        <body>
          <h2>${this.monthNames[this.currentMonth]} Comparison</h2>
          ${table.outerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  }
}
