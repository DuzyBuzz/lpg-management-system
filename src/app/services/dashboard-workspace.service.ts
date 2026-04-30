import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { EMPTY, Subject, catchError, startWith, switchMap, tap } from 'rxjs';

import { DashboardOverview, DashboardDateRange } from '../models/dashboard.model';
import {
  DashboardLoadProgress,
  DashboardService,
  DashboardViewMode,
  buildDashboardRange
} from './dashboard.service';

export type DashboardReportModeOption = {
  label: string;
  value: DashboardViewMode;
};

export type DashboardActionState = {
  label: string;
  title: string;
  detail: string;
};

@Injectable({ providedIn: 'root' })
export class DashboardWorkspaceService {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh$ = new Subject<void>();
  private readonly monthPeriodFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric'
  });
  private readonly yearPeriodFormatter = new Intl.DateTimeFormat('en-PH', {
    year: 'numeric'
  });
  private readonly longDateFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });

  readonly isLoading = signal(true);
  readonly overview = signal<DashboardOverview | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly loadProgress = signal<DashboardLoadProgress>(this.createPendingLoadProgress('monthly'));
  readonly activeAction = signal<DashboardActionState | null>(null);
  readonly reportMode = signal<DashboardViewMode>('monthly');
  readonly referenceDate = signal(new Date());
  readonly reportModeButtons: ReadonlyArray<DashboardReportModeOption> = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  readonly totals = computed(() => this.overview()?.totals ?? null);
  readonly notice = computed(() => this.overview()?.notice ?? null);
  readonly summaryCards = computed(() => this.overview()?.summaryCards ?? []);
  readonly trendPoints = computed(() => this.overview()?.trendPoints ?? []);
  readonly branchDistribution = computed(() => this.overview()?.branchDistribution ?? []);
  readonly branchDistributionPreview = computed(() => this.branchDistribution().slice(0, 5));
  readonly branchSalesRows = computed(() => this.overview()?.branchSalesRows ?? []);
  readonly volumeSalesRows = computed(() => this.overview()?.volumeSalesRows ?? []);
  readonly collectionRows = computed(() => this.overview()?.collectionRows ?? []);
  readonly varianceRows = computed(() => this.overview()?.varianceRows ?? []);
  readonly branchSalesTableRows = computed(() => [...this.branchSalesRows()]);
  readonly volumeSalesTableRows = computed(() => [...this.volumeSalesRows()]);
  readonly collectionTableRows = computed(() => [...this.collectionRows()]);
  readonly varianceTableRows = computed(() => [...this.varianceRows()]);
  readonly selectedPeriodLabel = computed(() =>
    this.formatSelectedPeriod(this.referenceDate(), this.reportMode())
  );
  readonly previousPeriodLabel = computed(() =>
    this.reportMode() === 'yearly' ? 'Prev Year' : 'Prev Month'
  );
  readonly nextPeriodLabel = computed(() =>
    this.reportMode() === 'yearly' ? 'Next Year' : 'Next Month'
  );
  readonly reportWindow = computed(() => this.formatRequestedRange(this.requestedRange()));
  readonly isActionInProgress = computed(() => this.activeAction() !== null);
  readonly actionProgressLabel = computed(() => this.activeAction()?.label ?? 'Processing report action');
  readonly actionProgressTitle = computed(() => this.activeAction()?.title ?? 'Preparing the requested action.');
  readonly actionProgressDescription = computed(
    () =>
      this.activeAction()?.detail ??
      'Please wait while the current report action finishes.'
  );
  readonly loadProgressValue = computed(() => this.loadProgress().percent);
  readonly hasDeterminateLoadProgress = computed(() => this.loadProgress().totalChunks > 1);
  readonly loadProgressLabel = computed(() => {
    const progress = this.loadProgress();

    if (progress.totalChunks <= 1) {
      return 'Loading live data';
    }

    const chunkSummary = `${progress.completedChunks} of ${progress.totalChunks} monthly chunks loaded`;

    return progress.failedChunks > 0
      ? `${chunkSummary}, ${progress.failedChunks} failed`
      : chunkSummary;
  });
  readonly hasVisibleDataWhileLoading = computed(() => this.isLoading() && this.hasData());
  readonly loadingStateTitle = computed(() => {
    return this.reportMode() === 'yearly'
      ? 'Generating the yearly report.'
      : 'Generating the report.';
  });
  readonly loadingStateDescription = computed(() => {
    if (this.reportMode() !== 'yearly') {
      return 'Requesting the live report for the selected period.';
    }

    return this.hasVisibleDataWhileLoading()
      ? `${this.loadProgressLabel()}. Showing the live data assembled so far while the remaining chunks finish loading.`
      : `${this.loadProgressLabel()}. Large date ranges are being processed in monthly batches, The report may take a moment to fully populate. Please wait while it loads.`;
  });
  readonly collectionRateLabel = computed(() => {
    const currentTotals = this.totals();

    return currentTotals
      ? `${currentTotals.collectionRate.toFixed(1)}% collection rate`
      : 'Collection rate pending';
  });
  readonly branchCountLabel = computed(() => {
    const currentTotals = this.totals();

    return currentTotals
      ? `${currentTotals.branchCount} branch groups tracked`
      : 'Branch groups pending';
  });
  readonly highVarianceLabel = computed(() => {
    const currentTotals = this.totals();

    return currentTotals
      ? `${currentTotals.highVarianceCount} high variance rows`
      : 'Variance pending';
  });
  readonly trendGroupingLabel = computed(() => {
    return this.reportMode() === 'yearly'
      ? 'Grouped by month for the selected year.'
      : 'Grouped by day for the selected month.';
  });
  readonly emptyStateTitle = computed(() => {
    return this.notice()?.title ?? 'No report data for the selected period.';
  });
  readonly emptyStateDescription = computed(() => {
    return (
      this.notice()?.detail ??
      'No records were returned for the selected reporting period.'
    );
  });
  readonly hasTrendData = computed(() => this.trendPoints().length > 0);
  readonly hasBranchDistribution = computed(() => this.branchDistribution().length > 0);
  readonly hasBranchSalesRows = computed(() => this.branchSalesRows().length > 0);
  readonly hasVolumeSalesRows = computed(() => this.volumeSalesRows().length > 0);
  readonly hasCollectionRows = computed(() => this.collectionRows().length > 0);
  readonly hasVarianceRows = computed(() => this.varianceRows().length > 0);
  readonly hasData = computed(() => {
    return (
      this.hasTrendData() ||
      this.hasBranchDistribution() ||
      this.hasBranchSalesRows() ||
      this.hasVolumeSalesRows() ||
      this.hasCollectionRows() ||
      this.hasVarianceRows()
    );
  });

  constructor() {
    this.refresh$
      .pipe(
        startWith(void 0),
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          this.overview.set(null);
          this.loadProgress.set(this.createPendingLoadProgress(this.reportMode()));
        }),
        switchMap(() =>
          this.dashboardService.getDashboardOverviewStream(this.requestedRange()).pipe(
            catchError(() => {
              this.overview.set(null);
              this.errorMessage.set(
                'The dashboard could not be loaded. Please try again in a moment.'
              );
              this.loadProgress.set(this.createPendingLoadProgress(this.reportMode()));
              this.isLoading.set(false);

              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((loadState) => {
        this.loadProgress.set(loadState.progress);

        if (loadState.overview) {
          this.overview.set(loadState.overview);
          this.lastUpdatedAt.set(new Date());
        }

        if (loadState.isComplete) {
          this.isLoading.set(false);
        }
      });
  }

  reload(): void {
    this.refresh$.next();
  }

  setReportMode(mode: DashboardViewMode): void {
    if (this.reportMode() === mode) {
      return;
    }

    this.reportMode.set(mode);
    this.reload();
  }

  goToPreviousPeriod(): void {
    this.shiftReferenceDate(-1);
  }

  goToNextPeriod(): void {
    this.shiftReferenceDate(1);
  }

  beginAction(action: 'print' | 'export'): void {
    const selectedPeriod = this.selectedPeriodLabel();

    this.activeAction.set(
      action === 'export'
        ? {
            label: 'Export in progress',
            title: 'Preparing the Excel export.',
            detail: `We are formatting the full ${selectedPeriod} report and compiling every available row into the Excel workbook. Please wait.`
          }
        : {
            label: 'Print in progress',
            title: 'Preparing the print preview.',
            detail: `We are laying out the full ${selectedPeriod} report and sending it to the print dialog. Please wait.`
          }
    );
  }

  endAction(): void {
    this.activeAction.set(null);
  }

  private requestedRange(): DashboardDateRange {
    return buildDashboardRange(this.reportMode(), this.referenceDate());
  }

  private shiftReferenceDate(direction: -1 | 1): void {
    const currentReferenceDate = this.referenceDate();
    const nextReferenceDate =
      this.reportMode() === 'yearly'
        ? new Date(currentReferenceDate.getFullYear() + direction, currentReferenceDate.getMonth(), 1)
        : new Date(currentReferenceDate.getFullYear(), currentReferenceDate.getMonth() + direction, 1);

    this.referenceDate.set(nextReferenceDate);
    this.reload();
  }

  private formatSelectedPeriod(referenceDate: Date, viewMode: DashboardViewMode): string {
    return viewMode === 'yearly'
      ? this.yearPeriodFormatter.format(referenceDate)
      : this.monthPeriodFormatter.format(referenceDate);
  }

  private formatRequestedRange(range: DashboardDateRange): string {
    return `${this.longDateFormatter.format(this.parseIsoDate(range.start))} - ${this.longDateFormatter.format(this.parseIsoDate(range.end))}`;
  }

  private parseIsoDate(value: string): Date {
    const [year, month, day] = value.split('-').map((part) => Number(part));

    return new Date(year, month - 1, day);
  }

  private createPendingLoadProgress(viewMode: DashboardViewMode): DashboardLoadProgress {
    return {
      completedChunks: 0,
      totalChunks: viewMode === 'yearly' ? 12 : 1,
      failedChunks: 0,
      percent: 0
    };
  }
}
