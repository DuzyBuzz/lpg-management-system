import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverSales } from './driver-sales';

describe('DriverSales', () => {
  let component: DriverSales;
  let fixture: ComponentFixture<DriverSales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverSales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverSales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
