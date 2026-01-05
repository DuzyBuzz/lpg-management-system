import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyComparison } from './monthly-comparison';

describe('MonthlyComparison', () => {
  let component: MonthlyComparison;
  let fixture: ComponentFixture<MonthlyComparison>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyComparison]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyComparison);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
