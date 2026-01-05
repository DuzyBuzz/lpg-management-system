import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchSalesMonthly } from './branch-sales-monthly';

describe('BranchSalesMonthly', () => {
  let component: BranchSalesMonthly;
  let fixture: ComponentFixture<BranchSalesMonthly>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchSalesMonthly]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BranchSalesMonthly);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
