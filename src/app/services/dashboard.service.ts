import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  DashboardApiResponse,
  DashboardBranchSalesDetailView,
  DashboardBranchSalesRowView,
  DashboardCollectionRowView,
  DashboardCollectionStatus,
  DashboardDateRange,
  DashboardDistributionPoint,
  DashboardNotice,
  DashboardOverview,
  DashboardSummaryCardView,
  DashboardTagSeverity,
  DashboardTotals,
  DashboardTrendPoint,
  DashboardVarianceRowView,
  DashboardVolumeSalesRowView,
  MeteredEntry,
  SalesEntry,
  SalesGroup
} from '../models/dashboard.model';

export type DashboardViewMode = 'monthly' | 'yearly';

const HIGH_VARIANCE_THRESHOLD = 500;
const MEDIUM_VARIANCE_THRESHOLD = 200;
const TOP_QUANTITY_ACCOUNT_LIMIT = 10;

const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const buildDashboardRange = (
  viewMode: DashboardViewMode,
  referenceDate = new Date()
): DashboardDateRange => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (viewMode === 'yearly') {
    return {
      start: toIsoDate(new Date(year, 0, 1)),
      end: toIsoDate(new Date(year, 11, 31))
    };
  }

  return {
    start: toIsoDate(new Date(year, month, 1)),
    end: toIsoDate(new Date(year, month + 1, 0))
  };
};

export const getDashboardViewModeLabel = (viewMode: DashboardViewMode): string => {
  return viewMode === 'yearly' ? 'Yearly view' : 'Monthly view';
};

export const DEFAULT_DASHBOARD_RANGE: DashboardDateRange = buildDashboardRange('monthly');

type TrendAccumulator = {
  label: string;
  timestamp: number;
  total: number;
  quantity: number;
};

type DashboardChunkLoadResult = {
  range: DashboardDateRange;
  response: DashboardApiResponse | null;
  error: HttpErrorResponse | null;
};

type DashboardResponseLoadResult = {
  response: DashboardApiResponse;
  failedRanges: ReadonlyArray<DashboardDateRange>;
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  private readonly compactNumberFormatter = new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0
  });

  private readonly decimalFormatter = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  private readonly percentageFormatter = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  private readonly currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  private readonly summaryCurrencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  private readonly shortDateFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit'
  });

  private readonly longDateFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });

  private readonly monthDateFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    year: 'numeric'
  });

  getDashboardOverview(
    range: DashboardDateRange = DEFAULT_DASHBOARD_RANGE
  ): Observable<DashboardOverview> {
    const viewMode = this.resolveViewMode(range);

    if (!environment.apiBaseUrl) {
      return of(
        this.createEmptyOverview(
          range,
          this.createNotice(
            'Data source unavailable',
            'Live report data is not configured for this environment.',
            'warn'
          ),
          'Unavailable',
          'warn'
        )
      );
    }

    return this.requestDashboardResponse(range, viewMode).pipe(
      map(({ response, failedRanges }) => {
        const hasRecords =
          response.metered.length > 0 ||
          response.sales.length > 0 ||
          response.salesGroups.length > 0;
        const hasPartialFailures = failedRanges.length > 0;

        return this.mapResponseToOverview(
          response,
          this.resolveOverviewNotice(hasRecords, failedRanges),
          hasPartialFailures ? 'Partial Live Data' : 'Live Data',
          hasPartialFailures ? 'warn' : hasRecords ? 'success' : 'warn',
          viewMode
        );
      }),
      catchError((error: HttpErrorResponse) => {
        return of(
          this.createEmptyOverview(
            range,
            this.createNotice('Data source unavailable', this.describeHttpError(error), 'warn')
          )
        );
      })
    );
  }

  private requestDashboardResponse(
    range: DashboardDateRange,
    viewMode: DashboardViewMode
  ): Observable<DashboardResponseLoadResult> {
    if (viewMode !== 'yearly') {
      return this.http.get<DashboardApiResponse>(this.buildEndpoint(range)).pipe(
        map((response) => ({
          response,
          failedRanges: []
        }))
      );
    }

    const monthlyRanges = this.buildMonthlyRanges(range);

    return forkJoin(monthlyRanges.map((monthlyRange) => this.requestDashboardChunk(monthlyRange))).pipe(
      map((chunkResults) => {
        const successfulResponses = chunkResults.flatMap((chunkResult) =>
          chunkResult.response ? [chunkResult.response] : []
        );

        if (successfulResponses.length === 0) {
          const firstError = chunkResults.find((chunkResult) => chunkResult.error)?.error;

          throw firstError ?? new HttpErrorResponse({ status: 0, statusText: 'No response' });
        }

        return {
          response: successfulResponses.reduce(
            (aggregatedResponse, monthlyResponse) =>
              this.mergeDashboardResponses(aggregatedResponse, monthlyResponse),
            this.createAggregateResponse(range)
          ),
          failedRanges: chunkResults
            .filter((chunkResult) => chunkResult.error !== null)
            .map((chunkResult) => chunkResult.range)
        };
      })
    );
  }

  private requestDashboardChunk(range: DashboardDateRange): Observable<DashboardChunkLoadResult> {
    return this.http.get<DashboardApiResponse>(this.buildEndpoint(range)).pipe(
      map((response) => ({
        range,
        response,
        error: null
      })),
      catchError((error: HttpErrorResponse) =>
        of({
          range,
          response: null,
          error
        })
      )
    );
  }

  private buildEndpoint(range: DashboardDateRange): string {
    const baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

    return `${baseUrl}/serviceapi/outlet_summary/${range.start}/${range.end}`;
  }

  private buildMonthlyRanges(range: DashboardDateRange): ReadonlyArray<DashboardDateRange> {
    const startDate = this.parseIsoDate(range.start);
    const endDate = this.parseIsoDate(range.end);
    const monthlyRanges: DashboardDateRange[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (cursor <= endDate) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

      monthlyRanges.push({
        start: toIsoDate(monthStart),
        end: toIsoDate(monthEnd > endDate ? endDate : monthEnd)
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return monthlyRanges;
  }

  private createAggregateResponse(range: DashboardDateRange): DashboardApiResponse {
    return {
      start: this.parseIsoDate(range.start).getTime(),
      end: this.parseIsoDate(range.end).getTime(),
      metered: [],
      sales: [],
      salesGroups: []
    };
  }

  private mergeDashboardResponses(
    aggregatedResponse: DashboardApiResponse,
    monthlyResponse: DashboardApiResponse
  ): DashboardApiResponse {
    return {
      start: aggregatedResponse.start,
      end: aggregatedResponse.end,
      metered: [...aggregatedResponse.metered, ...monthlyResponse.metered],
      sales: [...aggregatedResponse.sales, ...monthlyResponse.sales],
      salesGroups: this.mergeSalesGroups(
        aggregatedResponse.salesGroups,
        monthlyResponse.salesGroups
      )
    };
  }

  private mergeSalesGroups(
    existingGroups: ReadonlyArray<SalesGroup>,
    incomingGroups: ReadonlyArray<SalesGroup>
  ): ReadonlyArray<SalesGroup> {
    const mergedGroups = new Map<
      string,
      {
        branchId: number;
        branchName: string;
        sales: SalesEntry[];
      }
    >();

    for (const group of [...existingGroups, ...incomingGroups]) {
      const groupKey = `${group.branchId}:${group.branchName}`;
      const currentGroup = mergedGroups.get(groupKey);

      if (currentGroup) {
        currentGroup.sales.push(...group.sales);
        continue;
      }

      mergedGroups.set(groupKey, {
        branchId: group.branchId,
        branchName: group.branchName,
        sales: [...group.sales]
      });
    }

    return [...mergedGroups.values()].map((group) => ({
      branchId: group.branchId,
      branchName: group.branchName,
      sales: group.sales
    }));
  }

  private mapResponseToOverview(
    response: DashboardApiResponse,
    notice: DashboardNotice | null,
    sourceLabel = 'Live Data',
    sourceSeverity: DashboardTagSeverity = 'success',
    viewMode: DashboardViewMode = 'monthly'
  ): DashboardOverview {
    const grossSales = this.sumSales(response.sales, 'grandTotal');
    const collected = this.sumSales(response.sales, 'collected');
    const outstanding = this.sumSales(response.sales, 'balance');
    const totalVolume = this.sumMetered(response.metered, 'qty');
    const collectionRate = grossSales > 0 ? (collected / grossSales) * 100 : 0;
    const branchSalesRows = this.buildBranchSalesRows(response.salesGroups);
    const branchDistribution = this.buildBranchDistribution(branchSalesRows);
    const volumeSalesRows = this.buildVolumeSalesRows(response.metered);
    const collectionRows = this.buildCollectionRows(response.sales);
    const varianceRows = this.buildVarianceRows(response.metered);

    const totals: DashboardTotals = {
      grossSales,
      collected,
      outstanding,
      totalVolume,
      collectionRate,
      meteredAccounts: response.metered.length,
      salesAccounts: response.sales.length,
      branchCount: branchSalesRows.length,
      highVarianceCount: varianceRows.filter((row) => row.isHighVariance).length
    };

    return {
      periodLabel: `${this.formatDate(response.start)} - ${this.formatDate(response.end)}`,
      sourceLabel,
      sourceSeverity,
      notice,
      summaryCards: this.buildSummaryCards(totals),
      trendPoints: this.buildTrendPoints(response.metered, viewMode),
      branchDistribution,
      branchSalesRows,
      volumeSalesRows,
      collectionRows,
      varianceRows,
      totals
    };
  }

  private resolveOverviewNotice(
    hasRecords: boolean,
    failedRanges: ReadonlyArray<DashboardDateRange>
  ): DashboardNotice | null {
    if (failedRanges.length > 0) {
      return this.createNotice(
        'Partial yearly data',
        this.buildChunkFailureMessage(failedRanges, hasRecords),
        'warn'
      );
    }

    if (hasRecords) {
      return null;
    }

    return this.createNotice(
      'No report data',
      'No records were returned for the selected reporting period.',
      'info'
    );
  }

  private buildChunkFailureMessage(
    failedRanges: ReadonlyArray<DashboardDateRange>,
    hasRecords: boolean
  ): string {
    const previewLabels = failedRanges
      .slice(0, 3)
      .map((range) => this.monthDateFormatter.format(this.parseIsoDate(range.start)))
      .join(', ');
    const remainingCount = failedRanges.length - Math.min(failedRanges.length, 3);
    const suffix = remainingCount > 0 ? ` and ${remainingCount} more` : '';
    const chunkLabel = failedRanges.length === 1 ? 'monthly chunk' : 'monthly chunks';
    const availabilityMessage = hasRecords
      ? 'Showing the remaining live data.'
      : 'Any data shown is limited to the months that completed successfully.';

    return `${failedRanges.length} ${chunkLabel} could not be loaded (${previewLabels}${suffix}). ${availabilityMessage}`;
  }

  private createEmptyOverview(
    range: DashboardDateRange,
    notice: DashboardNotice,
    sourceLabel = 'No response',
    sourceSeverity: DashboardTagSeverity = 'warn'
  ): DashboardOverview {
    const zeroTotals: DashboardTotals = {
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

    return {
      periodLabel: this.formatRequestedPeriod(range),
      sourceLabel,
      sourceSeverity,
      notice,
      summaryCards: this.buildSummaryCards(zeroTotals),
      trendPoints: [],
      branchDistribution: [],
      branchSalesRows: [],
      volumeSalesRows: [],
      collectionRows: [],
      varianceRows: [],
      totals: zeroTotals
    };
  }

  private buildSummaryCards(totals: DashboardTotals): ReadonlyArray<DashboardSummaryCardView> {
    return [
      {
        label: 'Gross Sales',
        value: this.formatSummaryCurrency(totals.grossSales),
        helperText: `${this.formatCount(totals.salesAccounts)} sales records in scope`,
        icon: 'pi pi-wallet',
        tagLabel: `${this.formatCount(totals.branchCount)} branches tracked`,
        severity: 'success',
        accentClass: 'bg-emerald-100 text-emerald-700'
      },
      {
        label: 'Total Collected',
        value: this.formatSummaryCurrency(totals.collected),
        helperText: `${this.formatPercentage(totals.collectionRate)} collection rate`,
        icon: 'pi pi-check-circle',
        tagLabel: `${this.formatSummaryCurrency(totals.outstanding)} outstanding`,
        severity: 'info',
        accentClass: 'bg-sky-100 text-sky-700'
      },
      {
        label: 'Outstanding Balance',
        value: this.formatSummaryCurrency(totals.outstanding),
        helperText: `${this.formatCount(totals.salesAccounts)} accounts in collections`,
        icon: 'pi pi-briefcase',
        tagLabel: totals.outstanding > 0 ? 'Needs follow-up' : 'Cleared',
        severity: totals.outstanding > 0 ? 'warn' : 'success',
        accentClass: 'bg-amber-100 text-amber-700'
      },
      {
        label: 'Total Volume',
        value: this.formatDecimal(totals.totalVolume),
        helperText: `${this.formatCount(totals.meteredAccounts)} metered rows captured`,
        icon: 'pi pi-gauge',
        tagLabel: 'Metered quantity',
        severity: 'secondary',
        accentClass: 'bg-slate-100 text-slate-700'
      },
      {
        label: 'Collection Rate',
        value: this.formatPercentage(totals.collectionRate),
        helperText: `${this.formatCount(totals.highVarianceCount)} high variance rows`,
        icon: 'pi pi-percentage',
        tagLabel: totals.collectionRate >= 90 ? 'Healthy collections' : 'Monitor collections',
        severity: this.resolveCollectionRateSeverity(totals.collectionRate),
        accentClass: 'bg-rose-100 text-rose-700'
      }
    ];
  }

  private buildTrendPoints(
    metered: ReadonlyArray<MeteredEntry>,
    viewMode: DashboardViewMode
  ): ReadonlyArray<DashboardTrendPoint> {
    const grouped = new Map<number, TrendAccumulator>();

    for (const entry of metered) {
      const trendKey = this.resolveTrendKey(entry.readingDate, viewMode);
      const currentPoint = grouped.get(trendKey);

      if (currentPoint) {
        currentPoint.total += entry.total;
        currentPoint.quantity += entry.qty;
        continue;
      }

      grouped.set(trendKey, {
        label: this.formatTrendLabel(trendKey, viewMode),
        timestamp: trendKey,
        total: entry.total,
        quantity: entry.qty
      });
    }

    return [...grouped.values()]
      .sort((left, right) => left.timestamp - right.timestamp)
      .map(({ label, total, quantity }) => ({ label, total, quantity }));
  }

  private buildBranchDistribution(
    rows: ReadonlyArray<DashboardBranchSalesRowView>
  ): ReadonlyArray<DashboardDistributionPoint> {
    const totalBranchSales = rows.reduce((sum, row) => sum + row.totalSales, 0);

    return rows.map((row) => ({
      label: row.branchName,
      value: row.totalSales,
      valueLabel: this.formatSummaryCurrency(row.totalSales),
      shareLabel: `${this.formatPercentage(totalBranchSales > 0 ? (row.totalSales / totalBranchSales) * 100 : 0)} of branch sales`
    }));
  }

  private buildBranchSalesRows(
    groups: ReadonlyArray<SalesGroup>
  ): ReadonlyArray<DashboardBranchSalesRowView> {
    return [...groups]
      .map((group) => {
        const details = this.buildBranchSalesDetails(group);
        const totalSales = details.reduce((sum, detail) => sum + detail.total, 0);
        const collected = details.reduce((sum, detail) => sum + detail.collected, 0);
        const balance = details.reduce((sum, detail) => sum + detail.balance, 0);
        const collectionRate = totalSales > 0 ? (collected / totalSales) * 100 : 0;
        const detailCount = details.length;

        return {
          branchId: group.branchId,
          branchName: group.branchName,
          totalSales,
          totalSalesLabel: this.formatCurrency(totalSales),
          collected,
          collectedLabel: this.formatCurrency(collected),
          balance,
          balanceLabel: this.formatCurrency(balance),
          collectionRate,
          collectionRateLabel: this.formatPercentage(collectionRate),
          collectionRateSeverity: this.resolveCollectionRateSeverity(collectionRate),
          detailCount,
          detailCountLabel: `${this.formatCount(detailCount)}`,
          isExpandable: detailCount > 0,
          details
        };
      })
      .sort((left, right) => right.totalSales - left.totalSales);
  }

  private buildBranchSalesDetails(group: SalesGroup): ReadonlyArray<DashboardBranchSalesDetailView> {
    return group.sales.map((entry, index) => ({
      id: `${group.branchId}-${index}-${entry.accountName}`,
      accountName: entry.accountName,
      total: entry.grandTotal,
      totalLabel: this.formatCurrency(entry.grandTotal),
      collected: entry.collected,
      collectedLabel: this.formatCurrency(entry.collected),
      balance: entry.balance,
      balanceLabel: this.formatCurrency(entry.balance),
      discount: entry.discount,
      discountLabel: this.formatCurrency(entry.discount)
    }));
  }

  private buildVolumeSalesRows(
    metered: ReadonlyArray<MeteredEntry>
  ): ReadonlyArray<DashboardVolumeSalesRowView> {
    const topQuantityAccounts = this.resolveTopQuantityAccounts(metered);

    return [...metered]
      .sort((left, right) => {
        if (left.qty === right.qty) {
          return right.readingDate - left.readingDate;
        }

        return right.qty - left.qty;
      })
      .map((entry) => {
        const varianceSeverity = this.resolveVarianceSeverity(entry.variance);
        const isTopQuantityAccount = topQuantityAccounts.has(entry.accountName);

        return {
          id: entry.id,
          accountName: entry.accountName,
          address: entry.address,
          groupLabel: entry.group,
          readingDate: entry.readingDate,
          readingDateLabel: this.formatDate(entry.readingDate),
          quantity: entry.qty,
          quantityLabel: this.formatDecimal(entry.qty),
          rate: entry.rate,
          rateLabel: this.formatCurrency(entry.rate),
          total: entry.total,
          totalLabel: this.formatCurrency(entry.total),
          variance: entry.variance,
          varianceLabel: this.formatDecimal(entry.variance),
          varianceSeverity,
          isTopQuantityAccount,
          rowClass: isTopQuantityAccount ? 'table-row--highlight' : ''
        };
      });
  }

  private buildCollectionRows(sales: ReadonlyArray<SalesEntry>): ReadonlyArray<DashboardCollectionRowView> {
    return [...sales]
      .sort((left, right) => {
        if (left.balance === right.balance) {
          return right.total - left.total;
        }

        return right.balance - left.balance;
      })
      .map((entry) => {
        const status = this.resolveCollectionStatus(entry);

        return {
          accountName: entry.accountName,
          total: entry.total,
          totalLabel: this.formatCurrency(entry.total),
          collected: entry.collected,
          collectedLabel: this.formatCurrency(entry.collected),
          balance: entry.balance,
          balanceLabel: this.formatCurrency(entry.balance),
          discount: entry.discount,
          discountLabel: this.formatCurrency(entry.discount),
          statusLabel: status.label,
          statusSeverity: status.severity,
          rowClass: status.rowClass
        };
      });
  }

  private buildVarianceRows(
    metered: ReadonlyArray<MeteredEntry>
  ): ReadonlyArray<DashboardVarianceRowView> {
    return [...metered]
      .sort((left, right) => Math.abs(right.variance) - Math.abs(left.variance))
      .map((entry) => {
        const varianceSeverity = this.resolveVarianceSeverity(entry.variance);
        const isHighVariance = Math.abs(entry.variance) >= HIGH_VARIANCE_THRESHOLD;

        return {
          id: entry.id,
          accountName: entry.accountName,
          quantity: entry.qty,
          quantityLabel: this.formatDecimal(entry.qty),
          total: entry.total,
          totalLabel: this.formatCurrency(entry.total),
          variance: entry.variance,
          varianceLabel: this.formatDecimal(entry.variance),
          varianceSeverity,
          isHighVariance,
          rowClass: this.resolveVarianceRowClass(varianceSeverity)
        };
      });
  }

  private resolveTopQuantityAccounts(metered: ReadonlyArray<MeteredEntry>): ReadonlySet<string> {
    const totalsByAccount = new Map<string, number>();

    for (const entry of metered) {
      const currentTotal = totalsByAccount.get(entry.accountName) ?? 0;
      totalsByAccount.set(entry.accountName, currentTotal + entry.qty);
    }

    return new Set(
      [...totalsByAccount.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, TOP_QUANTITY_ACCOUNT_LIMIT)
        .map(([accountName]) => accountName)
    );
  }

  private resolveCollectionStatus(entry: SalesEntry): {
    label: DashboardCollectionStatus;
    severity: DashboardTagSeverity;
    rowClass: string;
  } {
    if (entry.balance <= 0) {
      return {
        label: 'Paid',
        severity: 'success',
        rowClass: ''
      };
    }

    if (entry.collected <= 0) {
      return {
        label: 'Unpaid',
        severity: 'danger',
        rowClass: 'table-row--danger'
      };
    }

    return {
      label: 'Partial',
      severity: 'warn',
      rowClass: 'table-row--warning'
    };
  }

  private resolveCollectionRateSeverity(rate: number): DashboardTagSeverity {
    if (rate >= 90) {
      return 'success';
    }

    if (rate >= 75) {
      return 'warn';
    }

    return 'danger';
  }

  private resolveVarianceSeverity(variance: number): DashboardTagSeverity {
    const absoluteVariance = Math.abs(variance);

    if (absoluteVariance >= HIGH_VARIANCE_THRESHOLD) {
      return 'danger';
    }

    if (absoluteVariance >= MEDIUM_VARIANCE_THRESHOLD) {
      return 'warn';
    }

    return 'success';
  }

  private resolveVarianceRowClass(severity: DashboardTagSeverity): string {
    if (severity === 'danger') {
      return 'table-row--danger';
    }

    if (severity === 'warn') {
      return 'table-row--warning';
    }

    return '';
  }

  private resolveTrendKey(timestamp: number, viewMode: DashboardViewMode): number {
    const date = new Date(timestamp);

    return viewMode === 'yearly'
      ? new Date(date.getFullYear(), date.getMonth(), 1).getTime()
      : new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  private formatTrendLabel(timestamp: number, viewMode: DashboardViewMode): string {
    const date = new Date(timestamp);

    return viewMode === 'yearly'
      ? this.monthDateFormatter.format(date)
      : this.shortDateFormatter.format(date);
  }

  private resolveViewMode(range: DashboardDateRange): DashboardViewMode {
    const startDate = this.parseIsoDate(range.start);
    const endDate = this.parseIsoDate(range.end);
    const isFullYearRange =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === 0 &&
      startDate.getDate() === 1 &&
      endDate.getMonth() === 11 &&
      endDate.getDate() === 31;

    return isFullYearRange ? 'yearly' : 'monthly';
  }

  private formatRequestedPeriod(range: DashboardDateRange): string {
    return `${this.longDateFormatter.format(this.parseIsoDate(range.start))} - ${this.longDateFormatter.format(this.parseIsoDate(range.end))}`;
  }

  private parseIsoDate(value: string): Date {
    const [year, month, day] = value.split('-').map((part) => Number(part));

    return new Date(year, month - 1, day);
  }

  private formatDate(timestamp: number): string {
    return this.longDateFormatter.format(new Date(timestamp));
  }

  private sumMetered(entries: ReadonlyArray<MeteredEntry>, key: keyof MeteredEntry): number {
    return entries.reduce((sum, entry) => sum + this.asNumber(entry[key]), 0);
  }

  private sumSales(entries: ReadonlyArray<SalesEntry>, key: keyof SalesEntry): number {
    return entries.reduce((sum, entry) => sum + this.asNumber(entry[key]), 0);
  }

  private asNumber(value: SalesEntry[keyof SalesEntry] | MeteredEntry[keyof MeteredEntry]): number {
    return typeof value === 'number' ? value : 0;
  }

  private formatCount(value: number): string {
    return this.compactNumberFormatter.format(value);
  }

  private formatDecimal(value: number): string {
    return this.decimalFormatter.format(value);
  }

  private formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  private formatSummaryCurrency(value: number): string {
    return this.summaryCurrencyFormatter.format(value);
  }

  private formatPercentage(value: number): string {
    return `${this.percentageFormatter.format(value)}%`;
  }

  private createNotice(
    title: string,
    detail: string,
    severity: DashboardTagSeverity
  ): DashboardNotice {
    return {
      title,
      detail,
      severity
    };
  }

  private describeHttpError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'The dashboard could not reach the live data service for this request.';
    }

    if (error.status >= 500) {
      return `The data service returned ${error.status}. Please try again shortly.`;
    }

    if (error.status >= 400) {
      return `The data service rejected the request with status ${error.status}.`;
    }

    return 'The live report request could not be completed.';
  }
}
