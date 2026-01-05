import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverSalesMonthly } from './driver-sales-monthly';

describe('DriverSalesMonthly', () => {
  let component: DriverSalesMonthly;
  let fixture: ComponentFixture<DriverSalesMonthly>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverSalesMonthly]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverSalesMonthly);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
