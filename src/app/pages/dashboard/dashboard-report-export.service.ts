import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import {
  DashboardBranchSalesRowView,
  DashboardTotals,
  DashboardVarianceRowView,
} from '../../models/dashboard.model';
import { DashboardWorkspaceService } from './dashboard-workspace.service';

type DashboardReportKey =
  | 'overview'
  | 'sales-trend'
  | 'branch-sales'
  | 'volume-sales'
  | 'collections'
  | 'variance';

type DashboardCellAlign = 'left' | 'center' | 'right';

type DashboardReportCell = {
  rawValue: string | number | null;
  displayValue: string;
  excelFormat?: string;
  align?: DashboardCellAlign;
};

type DashboardReportSummaryItem = {
  label: string;
  value: DashboardReportCell;
  helperText: string;
};

type DashboardReportTableColumn = {
  key: string;
  header: string;
  align?: DashboardCellAlign;
};

type DashboardReportTableRow = Record<string, DashboardReportCell>;

type DashboardReportExportPayload = {
  key: DashboardReportKey;
  title: string;
  subtitle: string;
  tableTitle: string;
  fileName: string;
  orientation: 'portrait' | 'landscape';
  summaryCards: ReadonlyArray<DashboardReportSummaryItem>;
  tableColumns: ReadonlyArray<DashboardReportTableColumn>;
  tableRows: ReadonlyArray<DashboardReportTableRow>;
  selectedPeriod: string;
  reportWindow: string;
  reportModeLabel: string;
  sourceLabel: string;
  exportedAtLabel: string;
  noticeDetail: string | null;
  rowCount: number;
};

const ZERO_TOTALS: DashboardTotals = {
  grossSales: 0,
  collected: 0,
  outstanding: 0,
  totalVolume: 0,
  collectionRate: 0,
  meteredAccounts: 0,
  salesAccounts: 0,
  branchCount: 0,
  highVarianceCount: 0
};

@Injectable({ providedIn: 'root' })
export class DashboardReportExportService {
  private readonly workspace = inject(DashboardWorkspaceService);
  private readonly router = inject(Router);
  private readonly exportedAtFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  async exportCurrentReportAsExcel(): Promise<void> {
    const report = this.buildCurrentReportExport();

    if (!report) {
      return;
    }

    const xlsx = await import('xlsx');
    const workbook = xlsx.utils.book_new();
    workbook.Props = {
      Title: report.title,
      Subject: report.subtitle,
      Author: 'LPG Analytics Dashboard',
      Company: 'LPG Analytics Dashboard',
      CreatedDate: new Date(),
      Keywords: 'lpg analytics dashboard export excel'
    };

    const summarySheet = this.createSummarySheet(xlsx, report);
    const tableSheet = this.createTableSheet(xlsx, report);

    xlsx.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    xlsx.utils.book_append_sheet(workbook, tableSheet, this.toWorksheetName(report.tableTitle));
    xlsx.writeFile(workbook, report.fileName);
  }

  printCurrentReport(): void {
    const report = this.buildCurrentReportExport();

    if (!report) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1280,height=900');

    if (!printWindow) {
      return;
    }

    const rowCountLabel = this.formatCount(report.rowCount);
    const summaryMarkup = report.summaryCards
      .map(
        (card) => `
          <section class="summary-card">
            <p class="summary-card__label">${this.escapeHtml(card.label)}</p>
            <p class="summary-card__value">${this.escapeHtml(card.value.displayValue)}</p>
            <p class="summary-card__helper">${this.escapeHtml(card.helperText)}</p>
          </section>`
      )
      .join('');
    const tableHeadMarkup = report.tableColumns
      .map(
        (column) =>
          `<th class="table-head table-head--${column.align ?? 'left'}">${this.escapeHtml(column.header)}</th>`
      )
      .join('');
    const tableBodyMarkup =
      report.tableRows.length > 0
        ? report.tableRows
            .map(
              (row) => `
                <tr>
                  ${report.tableColumns
                    .map((column) => {
                      const cell = row[column.key] ?? this.textCell('—');
                      const align = cell.align ?? column.align ?? 'left';

                      return `<td class="table-cell table-cell--${align}">${this.escapeHtml(
                        cell.displayValue
                      ).replace(/\n/g, '<br>')}</td>`;
                    })
                    .join('')}
                </tr>`
            )
            .join('')
        : `<tr><td colspan="${report.tableColumns.length}" class="table-empty">No rows are available for ${this.escapeHtml(report.selectedPeriod)}.</td></tr>`;
    const noticeMarkup = report.noticeDetail
      ? `<aside class="report-note"><strong>Report note:</strong> ${this.escapeHtml(report.noticeDetail)}</aside>`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${this.escapeHtml(report.title)} - ${this.escapeHtml(report.selectedPeriod)}</title>
          <style>
            @page { size: ${report.orientation}; margin: 14mm; }
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Manrope, "Segoe UI", sans-serif;
              color: #0f172a;
              background: linear-gradient(180deg, #f3f8ff 0%, #eef5ff 100%);
            }
            .report-shell {
              max-width: 1120px;
              margin: 0 auto;
              padding: 20px 24px 28px;
            }
            .report-hero {
              border-radius: 24px;
              background: linear-gradient(135deg, #0f2747 0%, #112f59 38%, #0f1f3d 100%);
              color: #ffffff;
              padding: 22px 24px;
              box-shadow: 0 24px 48px rgba(15, 23, 42, 0.14);
              page-break-inside: avoid;
            }
            .report-eyebrow {
              margin: 0;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: rgba(191, 219, 254, 0.86);
            }
            .report-title {
              margin: 8px 0 0;
              font-size: 28px;
              font-weight: 800;
              letter-spacing: -0.04em;
            }
            .report-subtitle {
              margin: 8px 0 0;
              font-size: 14px;
              color: rgba(226, 232, 240, 0.92);
            }
            .report-chip-row {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-top: 16px;
            }
            .report-chip {
              display: inline-flex;
              align-items: center;
              border-radius: 9999px;
              border: 1px solid rgba(191, 219, 254, 0.25);
              background: rgba(255, 255, 255, 0.1);
              padding: 8px 12px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.04em;
              color: rgba(226, 232, 240, 0.96);
            }
            .report-meta {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-top: 18px;
            }
            .report-meta__item {
              border: 1px solid rgba(255, 255, 255, 0.14);
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.1);
              padding: 10px 12px;
            }
            .report-meta__label {
              margin: 0;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: rgba(191, 219, 254, 0.86);
            }
            .report-meta__value {
              margin: 6px 0 0;
              font-size: 13px;
              font-weight: 700;
            }
            .report-note {
              margin-top: 16px;
              border: 1px solid rgba(245, 158, 11, 0.45);
              border-radius: 14px;
              background: rgba(255, 247, 219, 0.9);
              color: #7c2d12;
              padding: 12px 14px;
              font-size: 13px;
              line-height: 1.55;
              page-break-inside: avoid;
            }
            .report-section {
              margin-top: 20px;
              page-break-inside: avoid;
            }
            .report-section__eyebrow {
              margin: 0;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              color: #64748b;
            }
            .report-section__title {
              margin: 8px 0 0;
              font-size: 22px;
              font-weight: 800;
              letter-spacing: -0.03em;
              color: #0f172a;
            }
            .report-section__subtitle {
              margin: 8px 0 0;
              font-size: 13px;
              color: #516074;
              line-height: 1.6;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 12px;
              margin-top: 14px;
            }
            .summary-card {
              position: relative;
              overflow: hidden;
              border: 1px solid #dce7f1;
              border-radius: 18px;
              background: linear-gradient(180deg, #ffffff 0%, #f5faff 100%);
              box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
              padding: 16px 16px 15px;
              page-break-inside: avoid;
            }
            .summary-card::before {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #0f2747 0%, #0f766e 100%);
            }
            .summary-card__label {
              margin: 0;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              color: #64748b;
            }
            .summary-card__value {
              margin: 10px 0 0;
              font-size: 24px;
              font-weight: 800;
              letter-spacing: -0.03em;
              font-variant-numeric: tabular-nums;
            }
            .summary-card__helper {
              margin: 10px 0 0;
              font-size: 12px;
              line-height: 1.55;
              color: #516074;
            }
            .table-shell {
              margin-top: 20px;
              border: 1px solid #dce7f1;
              border-radius: 18px;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 14px 32px rgba(15, 23, 42, 0.05);
              page-break-inside: avoid;
            }
            .table-shell__header {
              padding: 18px 18px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .table-shell__kicker {
              margin: 0;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              color: #64748b;
            }
            .table-shell__title {
              margin: 8px 0 0;
              font-size: 20px;
              font-weight: 800;
            }
            .table-shell__subtitle {
              margin: 8px 0 0;
              font-size: 12px;
              color: #516074;
              line-height: 1.6;
            }
            .table-shell__meta {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-top: 12px;
            }
            .table-shell__meta-item {
              display: inline-flex;
              align-items: center;
              border-radius: 9999px;
              border: 1px solid #dce7f1;
              background: #f8fbff;
              padding: 7px 11px;
              font-size: 11px;
              font-weight: 700;
              color: #42566d;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              background: linear-gradient(180deg, #0f2747 0%, #14345f 100%);
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              text-align: left;
              padding: 12px 14px;
              border-bottom: 1px solid #dce7f1;
            }
            td {
              padding: 12px 14px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 12px;
              line-height: 1.55;
              vertical-align: top;
              white-space: pre-line;
            }
            .table-head--right,
            .table-cell--right {
              text-align: right;
              font-variant-numeric: tabular-nums;
            }
            .table-head--center,
            .table-cell--center {
              text-align: center;
            }
            tbody tr:nth-child(even) td {
              background: #f8fbff;
            }
            .table-empty {
              padding: 18px 14px;
              text-align: center;
              color: #64748b;
            }
            .report-footer {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px solid #dce7f1;
              color: #64748b;
              font-size: 11px;
            }
            @media print {
              body {
                background: #ffffff;
              }
              .report-shell {
                padding: 0;
              }
              .report-hero,
              .summary-card,
              .table-shell,
              .report-note {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <main class="report-shell">
            <section class="report-hero">
              <p class="report-eyebrow">Operations Analytics</p>
              <h1 class="report-title">${this.escapeHtml(report.title)}</h1>
              <p class="report-subtitle">${this.escapeHtml(report.subtitle)}</p>
              <div class="report-chip-row">
                <span class="report-chip">Filtered live dashboard data</span>
                <span class="report-chip">${this.escapeHtml(report.reportModeLabel)} reporting</span>
                <span class="report-chip">${this.escapeHtml(rowCountLabel)} rows exported</span>
              </div>
              <div class="report-meta">
                <div class="report-meta__item">
                  <p class="report-meta__label">Selected Period</p>
                  <p class="report-meta__value">${this.escapeHtml(report.selectedPeriod)}</p>
                </div>
                <div class="report-meta__item">
                  <p class="report-meta__label">Report Window</p>
                  <p class="report-meta__value">${this.escapeHtml(report.reportWindow)}</p>
                </div>
                <div class="report-meta__item">
                  <p class="report-meta__label">Report Mode</p>
                  <p class="report-meta__value">${this.escapeHtml(report.reportModeLabel)}</p>
                </div>
                <div class="report-meta__item">
                  <p class="report-meta__label">Data Source</p>
                  <p class="report-meta__value">${this.escapeHtml(report.sourceLabel)}</p>
                </div>
              </div>
            </section>
            ${noticeMarkup}
            <section class="report-section">
              <p class="report-section__eyebrow">Performance Summary</p>
              <h2 class="report-section__title">Executive metrics for the current filtered report</h2>
              <p class="report-section__subtitle">
                This printout mirrors the active report scope and uses the same filtered live data currently shown in the dashboard.
              </p>
              <section class="summary-grid">${summaryMarkup}</section>
            </section>
            <section class="table-shell">
              <div class="table-shell__header">
                <p class="table-shell__kicker">Filtered Table</p>
                <h2 class="table-shell__title">${this.escapeHtml(report.tableTitle)}</h2>
                <p class="table-shell__subtitle">
                  Review-ready detail rows formatted from the current dashboard filters.
                </p>
                <div class="table-shell__meta">
                  <span class="table-shell__meta-item">Rows: ${this.escapeHtml(rowCountLabel)}</span>
                  <span class="table-shell__meta-item">Source: ${this.escapeHtml(report.sourceLabel)}</span>
                  <span class="table-shell__meta-item">Exported: ${this.escapeHtml(report.exportedAtLabel)}</span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>${tableHeadMarkup}</tr>
                </thead>
                <tbody>
                  ${tableBodyMarkup}
                </tbody>
              </table>
            </section>
            <footer class="report-footer">
              <span>LPG Analytics Dashboard</span>
              <span>${this.escapeHtml(report.exportedAtLabel)}</span>
            </footer>
          </main>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  private buildCurrentReportExport(): DashboardReportExportPayload | null {
    const reportKey = this.resolveCurrentReportKey();

    switch (reportKey) {
      case 'overview':
        return this.buildOverviewReport();
      case 'sales-trend':
        return this.buildTrendReport();
      case 'branch-sales':
        return this.buildBranchSalesReport();
      case 'volume-sales':
        return this.buildVolumeSalesReport();
      case 'collections':
        return this.buildCollectionsReport();
      case 'variance':
        return this.buildVarianceReport();
      default:
        return null;
    }
  }

  private buildOverviewReport(): DashboardReportExportPayload {
    const totals = this.workspace.totals() ?? ZERO_TOTALS;
    const branchDetailRows = this.buildBranchDetailExportRows(this.workspace.branchSalesRows());

    return this.createPayload({
      key: 'overview',
      title: 'Executive Summary',
      subtitle: 'Revenue movement, branch contribution, and branch sales snapshot.',
      tableTitle: 'Branch Sales Detail Rows',
      orientation: 'landscape',
      summaryCards: this.buildOverviewSummaryCards(totals),
      tableColumns: [
        { key: 'branchName', header: 'Branch Name' },
        { key: 'accountName', header: 'Account Name' },
        { key: 'total', header: 'Total', align: 'right' },
        { key: 'collected', header: 'Collected', align: 'right' },
        { key: 'balance', header: 'Balance', align: 'right' },
        { key: 'discount', header: 'Discount', align: 'right' }
      ],
      tableRows: branchDetailRows
    });
  }

  private buildTrendReport(): DashboardReportExportPayload {
    const points = this.workspace.trendPoints();
    const highestPoint = [...points].sort((left, right) => right.total - left.total)[0] ?? null;
    const latestPoint = points.length > 0 ? points[points.length - 1] : null;
    const totals = this.workspace.totals();
    const rows = points
      .map((point) => ({
        label: point.label,
        total: point.total,
        quantity: point.quantity,
        totalLabel: this.formatCurrency(point.total),
        quantityLabel: this.formatDecimal(point.quantity),
        statusLabel:
          point.label === highestPoint?.label
            ? 'Peak'
            : point.label === latestPoint?.label
              ? 'Latest'
              : 'Observed'
      }))
      .sort((left, right) => right.total - left.total);

    return this.createPayload({
      key: 'sales-trend',
      title: 'Charts / Trends',
      subtitle: 'Filtered revenue and volume movement for the active reporting period.',
      tableTitle: 'Sales Trend Table',
      orientation: 'portrait',
      summaryCards: [
        {
          label: 'Tracked Points',
          value: this.integerCell(points.length),
          helperText: this.workspace.trendGroupingLabel()
        },
        {
          label: 'Peak Revenue',
          value: this.currencyCell(highestPoint?.total ?? 0, 0),
          helperText: highestPoint?.label ?? 'No peak period available'
        },
        {
          label: 'Latest Revenue',
          value: this.currencyCell(latestPoint?.total ?? 0, 0),
          helperText: latestPoint?.label ?? 'No recent point available'
        },
        {
          label: 'Total Volume',
          value: this.decimalCell(totals?.totalVolume ?? 0, 2),
          helperText: 'Metered quantity represented in the selected range'
        }
      ],
      tableColumns: [
        { key: 'label', header: 'Period' },
        { key: 'salesTotal', header: 'Sales Total', align: 'right' },
        { key: 'volume', header: 'Volume', align: 'right' },
        { key: 'status', header: 'Status', align: 'center' }
      ],
      tableRows: rows.map((row) => ({
        label: this.textCell(row.label),
        salesTotal: this.currencyCell(row.total, 2),
        volume: this.decimalCell(row.quantity, 2),
        status: this.textCell(row.statusLabel, 'center')
      }))
    });
  }

  private buildBranchSalesReport(): DashboardReportExportPayload {
    const rows = this.workspace.branchSalesRows();
    const topBranch = rows[0] ?? null;
    const collectedTotal = rows.reduce((sum, row) => sum + row.collected, 0);
    const outstandingTotal = rows.reduce((sum, row) => sum + row.balance, 0);
    const branchDetailRows = this.buildBranchDetailExportRows(rows);

    return this.createPayload({
      key: 'branch-sales',
      title: 'Branch Sales',
      subtitle: 'Branch performance and collection depth for the filtered live report.',
      tableTitle: 'Branch Sales Detail Table',
      orientation: 'landscape',
      summaryCards: [
        {
          label: 'Branch Groups',
          value: this.integerCell(rows.length),
          helperText: 'Branch groups contributing to the active report'
        },
        {
          label: 'Top Branch',
          value: this.currencyCell(topBranch?.totalSales ?? 0, 0),
          helperText: topBranch?.branchName ?? 'No branch data available'
        },
        {
          label: 'Collected',
          value: this.currencyCell(collectedTotal, 0),
          helperText: 'Collections captured across grouped branch sales'
        },
        {
          label: 'Outstanding',
          value: this.currencyCell(outstandingTotal, 0),
          helperText: 'Open balances that still require branch follow-up'
        }
      ],
      tableColumns: [
        { key: 'branchName', header: 'Branch Name' },
        { key: 'accountName', header: 'Account Name' },
        { key: 'total', header: 'Total', align: 'right' },
        { key: 'collected', header: 'Collected', align: 'right' },
        { key: 'balance', header: 'Balance', align: 'right' },
        { key: 'discount', header: 'Discount', align: 'right' }
      ],
      tableRows: branchDetailRows
    });
  }

  private buildVolumeSalesReport(): DashboardReportExportPayload {
    const rows = this.workspace.volumeSalesRows();
    const topQuantityRow = rows[0] ?? null;
    const totalValue = rows.reduce((sum, row) => sum + row.total, 0);
    const totals = this.workspace.totals();

    return this.createPayload({
      key: 'volume-sales',
      title: 'Volume Sales',
      subtitle: 'Metered quantity, value, and variance review for the active report.',
      tableTitle: 'Volume Sales Table',
      orientation: 'landscape',
      summaryCards: [
        {
          label: 'Total Volume',
          value: this.decimalCell(totals?.totalVolume ?? 0, 2),
          helperText: 'Metered quantity captured in the active period'
        },
        {
          label: 'Metered Value',
          value: this.currencyCell(totalValue, 0),
          helperText: 'Total metered billing derived from live reading rows'
        },
        {
          label: 'Top Account',
          value: this.decimalCell(topQuantityRow?.quantity ?? 0, 2),
          helperText: topQuantityRow?.accountName ?? 'No quantity leader available'
        },
        {
          label: 'Variance Alerts',
          value: this.integerCell(
            rows.filter((row) => row.varianceSeverity === 'danger' || row.varianceSeverity === 'warn').length
          ),
          helperText: 'Rows that require monitoring for unusual variance levels'
        }
      ],
      tableColumns: [
        { key: 'account', header: 'Account' },
        { key: 'readingDate', header: 'Reading Date' },
        { key: 'quantity', header: 'Quantity', align: 'right' },
        { key: 'rate', header: 'Rate', align: 'right' },
        { key: 'total', header: 'Total', align: 'right' },
        { key: 'variance', header: 'Variance', align: 'right' }
      ],
      tableRows: this.workspace.volumeSalesTableRows().map((row) => ({
        account: this.textCell(`${row.accountName}\n${row.address} | ${row.groupLabel}`),
        readingDate: this.textCell(row.readingDateLabel),
        quantity: this.decimalCell(row.quantity, 2),
        rate: this.currencyCell(row.rate, 2),
        total: this.currencyCell(row.total, 2),
        variance: this.decimalCell(row.variance, 2)
      }))
    });
  }

  private buildCollectionsReport(): DashboardReportExportPayload {
    const rows = this.workspace.collectionRows();
    const totals = this.workspace.totals();
    const paidExposure = rows
      .filter((row) => row.statusLabel === 'Paid')
      .reduce((sum, row) => sum + row.total, 0);
    const partialExposure = rows
      .filter((row) => row.statusLabel === 'Partial')
      .reduce((sum, row) => sum + row.total, 0);
    const unpaidExposure = rows
      .filter((row) => row.statusLabel === 'Unpaid')
      .reduce((sum, row) => sum + row.total, 0);

    return this.createPayload({
      key: 'collections',
      title: 'Collection Report',
      subtitle: 'Collection standing, exposure, and follow-up status for filtered accounts.',
      tableTitle: 'Collections Table',
      orientation: 'landscape',
      summaryCards: [
        {
          label: 'Collection Rate',
          value: this.percentCell(totals?.collectionRate ?? 0, 1),
          helperText: `Outstanding balance ${this.formatCurrency(totals?.outstanding ?? 0)}`
        },
        {
          label: 'Paid Accounts',
          value: this.integerCell(rows.filter((row) => row.statusLabel === 'Paid').length),
          helperText: `Exposure ${this.formatCurrency(paidExposure)}`
        },
        {
          label: 'Partial Accounts',
          value: this.integerCell(rows.filter((row) => row.statusLabel === 'Partial').length),
          helperText: `Exposure ${this.formatCurrency(partialExposure)}`
        },
        {
          label: 'Unpaid Accounts',
          value: this.integerCell(rows.filter((row) => row.statusLabel === 'Unpaid').length),
          helperText: `Exposure ${this.formatCurrency(unpaidExposure)}`
        }
      ],
      tableColumns: [
        { key: 'accountName', header: 'Account Name' },
        { key: 'total', header: 'Total', align: 'right' },
        { key: 'collected', header: 'Collected', align: 'right' },
        { key: 'balance', header: 'Balance', align: 'right' },
        { key: 'discount', header: 'Discount', align: 'right' },
        { key: 'status', header: 'Status', align: 'center' }
      ],
      tableRows: this.workspace.collectionTableRows().map((row) => ({
        accountName: this.textCell(row.accountName),
        total: this.currencyCell(row.total, 2),
        collected: this.currencyCell(row.collected, 2),
        balance: this.currencyCell(row.balance, 2),
        discount: this.currencyCell(row.discount, 2),
        status: this.textCell(row.statusLabel, 'center')
      }))
    });
  }

  private buildVarianceReport(): DashboardReportExportPayload {
    const rows = this.workspace.varianceRows();
    const topVarianceRow = rows[0] ?? null;
    const atRiskValue = rows
      .filter((row) => row.varianceSeverity === 'danger' || row.varianceSeverity === 'warn')
      .reduce((sum, row) => sum + row.total, 0);

    return this.createPayload({
      key: 'variance',
      title: 'Variance Report',
      subtitle: 'Variance exposure, alerts, and monitored rows for the active report.',
      tableTitle: 'Variance Table',
      orientation: 'portrait',
      summaryCards: [
        {
          label: 'Highest Variance',
          value: this.decimalCell(topVarianceRow?.variance ?? 0, 2),
          helperText: topVarianceRow?.accountName ?? 'No variance leader available'
        },
        {
          label: 'Alert Rows',
          value: this.integerCell(rows.filter((row) => row.varianceSeverity === 'danger').length),
          helperText: 'Rows above the highest variance threshold'
        },
        {
          label: 'Monitor Rows',
          value: this.integerCell(rows.filter((row) => row.varianceSeverity === 'warn').length),
          helperText: 'Rows that should be monitored for developing variance'
        },
        {
          label: 'At-risk Value',
          value: this.currencyCell(atRiskValue, 0),
          helperText: 'Billing value tied to warning and alert variance rows'
        }
      ],
      tableColumns: [
        { key: 'accountName', header: 'Account Name' },
        { key: 'quantity', header: 'Quantity', align: 'right' },
        { key: 'total', header: 'Total', align: 'right' },
        { key: 'variance', header: 'Variance', align: 'right' },
        { key: 'status', header: 'Status', align: 'center' }
      ],
      tableRows: this.workspace.varianceTableRows().map((row) => ({
        accountName: this.textCell(row.accountName),
        quantity: this.decimalCell(row.quantity, 2),
        total: this.currencyCell(row.total, 2),
        variance: this.decimalCell(row.variance, 2),
        status: this.textCell(this.formatVarianceStatus(row), 'center')
      }))
    });
  }

  private createPayload(input: {
    key: DashboardReportKey;
    title: string;
    subtitle: string;
    tableTitle: string;
    orientation: 'portrait' | 'landscape';
    summaryCards: ReadonlyArray<DashboardReportSummaryItem>;
    tableColumns: ReadonlyArray<DashboardReportTableColumn>;
    tableRows: ReadonlyArray<DashboardReportTableRow>;
  }): DashboardReportExportPayload {
    const selectedPeriod = this.workspace.selectedPeriodLabel();

    return {
      ...input,
      fileName: `lpg-${input.key}-${this.slugify(selectedPeriod)}.xlsx`,
      selectedPeriod,
      reportWindow: this.workspace.reportWindow(),
      reportModeLabel: this.workspace.reportMode() === 'yearly' ? 'Yearly' : 'Monthly',
      sourceLabel: this.workspace.overview()?.sourceLabel ?? 'No response',
      exportedAtLabel: this.exportedAtFormatter.format(new Date()),
      noticeDetail: this.workspace.notice()?.detail ?? null,
      rowCount: input.tableRows.length
    };
  }

  private createSummarySheet(
    xlsx: typeof import('xlsx'),
    report: DashboardReportExportPayload
  ): import('xlsx').WorkSheet {
    const summaryRows: Array<Array<string | number>> = [
      this.createWideRow(report.title, 4),
      this.createWideRow(report.subtitle, 4),
      ['', '', '', ''],
      ['Selected Period', report.selectedPeriod, 'Report Window', report.reportWindow],
      ['Report Mode', report.reportModeLabel, 'Data Source', report.sourceLabel],
      ['Exported At', report.exportedAtLabel, 'Rows Exported', report.rowCount]
    ];
    const widthRows: string[][] = [
      this.createWideRow(report.title, 4),
      this.createWideRow(report.subtitle, 4),
      ['', '', '', ''],
      ['Selected Period', report.selectedPeriod, 'Report Window', report.reportWindow],
      ['Report Mode', report.reportModeLabel, 'Data Source', report.sourceLabel],
      ['Exported At', report.exportedAtLabel, 'Rows Exported', this.formatCount(report.rowCount)]
    ];
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
    ];

    if (report.noticeDetail) {
      summaryRows.push(['Report Note', report.noticeDetail, '', '']);
      widthRows.push(['Report Note', report.noticeDetail, '', '']);
      merges.push({ s: { r: summaryRows.length - 1, c: 1 }, e: { r: summaryRows.length - 1, c: 3 } });
    }

    summaryRows.push(['', '', '', '']);
    widthRows.push(['', '', '', '']);

    const summaryHeaderRowIndex = summaryRows.length;
    summaryRows.push(['Summary Metric', 'Value', 'Notes', '']);
    widthRows.push(['Summary Metric', 'Value', 'Notes', '']);

    const summaryStartRowIndex = summaryRows.length;

    for (const card of report.summaryCards) {
      summaryRows.push([
        card.label,
        this.toExcelCellValue(card.value),
        card.helperText,
        ''
      ]);
      widthRows.push([card.label, card.value.displayValue, card.helperText, '']);
    }

    const sheet = xlsx.utils.aoa_to_sheet(summaryRows);
    sheet['!merges'] = merges;
    sheet['!cols'] = this.buildExcelColumnWidths(widthRows, [20, 20, 46, 18]);

    if (report.summaryCards.length > 0) {
      sheet['!autofilter'] = {
        ref: xlsx.utils.encode_range({
          s: { r: summaryHeaderRowIndex, c: 0 },
          e: { r: summaryStartRowIndex + report.summaryCards.length - 1, c: 2 }
        })
      };
    }

    this.applyExcelCellFormat(xlsx, sheet, 5, 3, this.integerCell(report.rowCount));

    report.summaryCards.forEach((card, index) => {
      this.applyExcelCellFormat(xlsx, sheet, summaryStartRowIndex + index, 1, card.value);
    });

    return sheet;
  }

  private createTableSheet(
    xlsx: typeof import('xlsx'),
    report: DashboardReportExportPayload
  ): import('xlsx').WorkSheet {
    const columnCount = Math.max(report.tableColumns.length, 4);
    const tableRows: Array<Array<string | number>> = [
      this.createWideRow(report.title, columnCount),
      this.createWideRow(report.subtitle, columnCount),
      this.createWideRow(
        `Selected Period: ${report.selectedPeriod} | Window: ${report.reportWindow} | Mode: ${report.reportModeLabel}`,
        columnCount
      ),
      this.createWideRow(
        `Source: ${report.sourceLabel} | Exported: ${report.exportedAtLabel} | Rows: ${this.formatCount(report.rowCount)}`,
        columnCount
      ),
      Array.from({ length: columnCount }, () => ''),
      [
        ...report.tableColumns.map((column) => column.header),
        ...Array.from({ length: Math.max(columnCount - report.tableColumns.length, 0) }, () => '')
      ]
    ];
    const widthRows: string[][] = [
      this.createWideRow(report.title, columnCount),
      this.createWideRow(report.subtitle, columnCount),
      this.createWideRow(
        `Selected Period: ${report.selectedPeriod} | Window: ${report.reportWindow} | Mode: ${report.reportModeLabel}`,
        columnCount
      ),
      this.createWideRow(
        `Source: ${report.sourceLabel} | Exported: ${report.exportedAtLabel} | Rows: ${this.formatCount(report.rowCount)}`,
        columnCount
      ),
      Array.from({ length: columnCount }, () => ''),
      [
        ...report.tableColumns.map((column) => column.header),
        ...Array.from({ length: Math.max(columnCount - report.tableColumns.length, 0) }, () => '')
      ]
    ];
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: columnCount - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: columnCount - 1 } }
    ];
    const tableHeaderRowIndex = 5;
    const tableStartRowIndex = 6;

    if (report.tableRows.length > 0) {
      for (const row of report.tableRows) {
        tableRows.push([
          ...report.tableColumns.map((column) => this.toExcelCellValue(row[column.key] ?? this.textCell('—'))),
          ...Array.from({ length: Math.max(columnCount - report.tableColumns.length, 0) }, () => '')
        ]);
        widthRows.push([
          ...report.tableColumns.map((column) => (row[column.key] ?? this.textCell('—')).displayValue),
          ...Array.from({ length: Math.max(columnCount - report.tableColumns.length, 0) }, () => '')
        ]);
      }
    } else {
      tableRows.push(this.createWideRow(`No rows are available for ${report.selectedPeriod}.`, columnCount));
      widthRows.push(this.createWideRow(`No rows are available for ${report.selectedPeriod}.`, columnCount));
      merges.push({ s: { r: tableStartRowIndex, c: 0 }, e: { r: tableStartRowIndex, c: columnCount - 1 } });
    }

    const sheet = xlsx.utils.aoa_to_sheet(tableRows);
    sheet['!merges'] = merges;
    sheet['!cols'] = this.buildExcelColumnWidths(widthRows);

    if (report.tableRows.length > 0) {
      sheet['!autofilter'] = {
        ref: xlsx.utils.encode_range({
          s: { r: tableHeaderRowIndex, c: 0 },
          e: { r: tableStartRowIndex + report.tableRows.length - 1, c: report.tableColumns.length - 1 }
        })
      };
    }

    report.tableRows.forEach((row, rowIndex) => {
      report.tableColumns.forEach((column, columnIndex) => {
        this.applyExcelCellFormat(
          xlsx,
          sheet,
          tableStartRowIndex + rowIndex,
          columnIndex,
          row[column.key] ?? this.textCell('—')
        );
      });
    });

    return sheet;
  }

  private applyExcelCellFormat(
    xlsx: typeof import('xlsx'),
    sheet: import('xlsx').WorkSheet,
    rowIndex: number,
    columnIndex: number,
    cell: DashboardReportCell
  ): void {
    if (typeof cell.rawValue !== 'number' || !cell.excelFormat) {
      return;
    }

    const address = xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex });
    const worksheetCell = sheet[address];

    if (!worksheetCell) {
      return;
    }

    worksheetCell.z = cell.excelFormat;
  }

  private buildExcelColumnWidths(
    rows: ReadonlyArray<ReadonlyArray<string>>,
    minimumWidths: ReadonlyArray<number> = []
  ): Array<{ wch: number }> {
    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

    return Array.from({ length: columnCount }, (_, columnIndex) => {
      const longestCell = rows.reduce((max, row) => {
        const value = row[columnIndex] ?? '';
        const longestLine = value
          .split('\n')
          .reduce((lineMax, line) => Math.max(lineMax, line.length), 0);

        return Math.max(max, longestLine);
      }, 0);

      return {
        wch: Math.min(
          Math.max(longestCell + 2, minimumWidths[columnIndex] ?? 14),
          48
        )
      };
    });
  }

  private buildOverviewSummaryCards(totals: DashboardTotals): ReadonlyArray<DashboardReportSummaryItem> {
    return [
      {
        label: 'Gross Sales',
        value: this.currencyCell(totals.grossSales, 0),
        helperText: `${this.formatCount(totals.salesAccounts)} sales records in scope`
      },
      {
        label: 'Total Collected',
        value: this.currencyCell(totals.collected, 0),
        helperText: `${this.formatPercentage(totals.collectionRate)} collection rate`
      },
      {
        label: 'Outstanding Balance',
        value: this.currencyCell(totals.outstanding, 0),
        helperText: `${this.formatCount(totals.salesAccounts)} accounts in collections`
      },
      {
        label: 'Total Volume',
        value: this.decimalCell(totals.totalVolume, 2),
        helperText: `${this.formatCount(totals.meteredAccounts)} metered rows captured`
      },
      {
        label: 'Collection Rate',
        value: this.percentCell(totals.collectionRate, 1),
        helperText: `${this.formatCount(totals.highVarianceCount)} high variance rows`
      }
    ];
  }

  private buildBranchDetailExportRows(
    rows: ReadonlyArray<DashboardBranchSalesRowView>
  ): ReadonlyArray<DashboardReportTableRow> {
    return rows.flatMap((row) =>
      row.details.map((detail) => ({
        branchName: this.textCell(row.branchName),
        accountName: this.textCell(detail.accountName),
        total: this.currencyCell(detail.total, 2),
        collected: this.currencyCell(detail.collected, 2),
        balance: this.currencyCell(detail.balance, 2),
        discount: this.currencyCell(detail.discount, 2)
      }))
    );
  }

  private createWideRow(value: string, columnCount: number): string[] {
    return [
      value,
      ...Array.from({ length: Math.max(columnCount - 1, 0) }, () => '')
    ];
  }

  private toExcelCellValue(cell: DashboardReportCell): string | number {
    return typeof cell.rawValue === 'number' ? cell.rawValue : cell.displayValue;
  }

  private toWorksheetName(value: string): string {
    const normalizedValue = value.replace(/[\\/?*\[\]:]/g, ' ').trim();

    if (!normalizedValue) {
      return 'Report Data';
    }

    return normalizedValue.slice(0, 31);
  }

  private resolveCurrentReportKey(): DashboardReportKey {
    const segments = this.router.url.split(/[?#]/)[0].split('/').filter(Boolean);
    const dashboardIndex = segments.indexOf('dashboard');
    const routeKey = segments[dashboardIndex + 1] as DashboardReportKey | undefined;

    return routeKey ?? 'overview';
  }

  private formatVarianceStatus(row: DashboardVarianceRowView): string {
    if (row.varianceSeverity === 'danger') {
      return 'Alert';
    }

    if (row.varianceSeverity === 'warn') {
      return 'Monitor';
    }

    return 'Normal';
  }

  private formatCount(value: number): string {
    return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(value);
  }

  private formatDecimal(value: number, fractionDigits = 2): string {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value);
  }

  private formatPercentage(value: number, fractionDigits = 1): string {
    return `${this.formatDecimal(value, fractionDigits)}%`;
  }

  private formatCurrency(
    value: number,
    minimumFractionDigits = 0,
    maximumFractionDigits = minimumFractionDigits
  ): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(value);
  }

  private textCell(value: string, align: DashboardCellAlign = 'left'): DashboardReportCell {
    return {
      rawValue: value,
      displayValue: value,
      align
    };
  }

  private integerCell(value: number, align: DashboardCellAlign = 'right'): DashboardReportCell {
    return {
      rawValue: value,
      displayValue: this.formatCount(value),
      excelFormat: '#,##0',
      align
    };
  }

  private decimalCell(
    value: number,
    fractionDigits = 2,
    align: DashboardCellAlign = 'right'
  ): DashboardReportCell {
    return {
      rawValue: value,
      displayValue: this.formatDecimal(value, fractionDigits),
      excelFormat: this.buildExcelDecimalFormat(fractionDigits),
      align
    };
  }

  private currencyCell(
    value: number,
    fractionDigits = 2,
    align: DashboardCellAlign = 'right'
  ): DashboardReportCell {
    return {
      rawValue: value,
      displayValue: this.formatCurrency(value, fractionDigits, fractionDigits),
      excelFormat: this.buildExcelCurrencyFormat(fractionDigits),
      align
    };
  }

  private percentCell(
    value: number,
    fractionDigits = 1,
    align: DashboardCellAlign = 'right'
  ): DashboardReportCell {
    return {
      rawValue: value,
      displayValue: this.formatPercentage(value, fractionDigits),
      excelFormat: this.buildExcelPercentageFormat(fractionDigits),
      align
    };
  }

  private buildExcelDecimalFormat(fractionDigits: number): string {
    return fractionDigits > 0 ? `#,##0.${'0'.repeat(fractionDigits)}` : '#,##0';
  }

  private buildExcelCurrencyFormat(fractionDigits: number): string {
    return `"PHP" ${this.buildExcelDecimalFormat(fractionDigits)}`;
  }

  private buildExcelPercentageFormat(fractionDigits: number): string {
    return `${this.buildExcelDecimalFormat(fractionDigits)}"%"`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }
}