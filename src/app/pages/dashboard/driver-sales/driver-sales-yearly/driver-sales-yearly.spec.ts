import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverSalesYearly } from './driver-sales-yearly';

describe('DriverSalesYearly', () => {
  let component: DriverSalesYearly;
  let fixture: ComponentFixture<DriverSalesYearly>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverSalesYearly]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverSalesYearly);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
