import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { DashboardWorkspaceService } from '../../dashboard-workspace.service';
import {
  DashboardHeaderComponent,
  DashboardHeaderNavItem
} from './dashboard-header.component';

describe('DashboardHeaderComponent', () => {
  let component: DashboardHeaderComponent;
  let fixture: ComponentFixture<DashboardHeaderComponent>;

  const navItems: ReadonlyArray<DashboardHeaderNavItem> = [
    {
      label: 'Executive Summary',
      route: 'overview',
      icon: 'pi pi-home'
    }
  ];

  const workspaceStub = {
    reportModeButtons: [
      { value: 'monthly' as const, label: 'Monthly' },
      { value: 'yearly' as const, label: 'Yearly' }
    ],
    reportMode: signal<'monthly' | 'yearly'>('monthly'),
    selectedPeriodLabel: signal('April 2026'),
    reportWindow: signal('Apr 01, 2026 - Apr 30, 2026'),
    previousPeriodLabel: signal('Prev Month'),
    nextPeriodLabel: signal('Next Month'),
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
    setReportMode: jasmine.createSpy('setReportMode'),
    goToPreviousPeriod: jasmine.createSpy('goToPreviousPeriod'),
    goToNextPeriod: jasmine.createSpy('goToNextPeriod')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardHeaderComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: DashboardWorkspaceService,
          useValue: workspaceStub
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardHeaderComponent);
    fixture.componentRef.setInput('navItems', navItems);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
