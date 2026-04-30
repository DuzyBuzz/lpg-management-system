import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { DashboardWorkspaceService } from '../../services/dashboard-workspace.service';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  const workspaceStub = {
    reportModeButtons: [
      { value: 'monthly' as const, label: 'Monthly Report' },
      { value: 'yearly' as const, label: 'Yearly Report' }
    ],
    reportMode: signal<'monthly' | 'yearly'>('monthly'),
    selectedPeriodLabel: signal('April 2026'),
    reportWindow: signal('Apr 01, 2026 - Apr 30, 2026'),
    previousPeriodLabel: signal('Prev Month'),
    nextPeriodLabel: signal('Next Month'),
    overview: signal({ sourceLabel: 'Live Data', sourceSeverity: 'success' as const }),
    notice: signal(null),
    totals: signal({
      grossSales: 100000,
      collected: 90000,
      outstanding: 10000,
      totalVolume: 120,
      collectionRate: 90,
      meteredAccounts: 15,
      salesAccounts: 10,
      branchCount: 3,
      highVarianceCount: 1
    }),
    lastUpdatedAt: signal(new Date('2026-04-23T10:15:00')),
    errorMessage: signal<string | null>(null),
    isLoading: signal(false),
    hasData: signal(true),
    hasDeterminateLoadProgress: signal(false),
    isActionInProgress: signal(false),
    actionProgressLabel: signal('Export in progress'),
    actionProgressTitle: signal('Preparing the Excel export.'),
    actionProgressDescription: signal('We are preparing the full report action.'),
    loadProgressLabel: signal('Loading live data'),
    loadProgressValue: signal(0),
    loadingStateTitle: signal('Generating the report.'),
    loadingStateDescription: signal('Requesting the live report for the selected period.'),
    emptyStateTitle: signal('No report data'),
    emptyStateDescription: signal('No records were returned.'),
    setReportMode: jasmine.createSpy('setReportMode'),
    goToPreviousPeriod: jasmine.createSpy('goToPreviousPeriod'),
    goToNextPeriod: jasmine.createSpy('goToNextPeriod'),
    reload: jasmine.createSpy('reload')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        {
          provide: DashboardWorkspaceService,
          useValue: workspaceStub
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
