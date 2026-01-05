import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumeSalesMonthly } from './volume-sales-monthly';

describe('VolumeSalesMonthly', () => {
  let component: VolumeSalesMonthly;
  let fixture: ComponentFixture<VolumeSalesMonthly>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolumeSalesMonthly]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VolumeSalesMonthly);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
