import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchSales } from './branch-sales';

describe('BranchSales', () => {
  let component: BranchSales;
  let fixture: ComponentFixture<BranchSales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchSales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BranchSales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
