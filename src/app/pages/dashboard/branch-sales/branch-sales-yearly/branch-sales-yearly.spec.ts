import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchSalesYearly } from './branch-sales-yearly';

describe('BranchSalesYearly', () => {
  let component: BranchSalesYearly;
  let fixture: ComponentFixture<BranchSalesYearly>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchSalesYearly]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BranchSalesYearly);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
