import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumeSalesYearly } from './volume-sales-yearly';

describe('VolumeSalesYearly', () => {
  let component: VolumeSalesYearly;
  let fixture: ComponentFixture<VolumeSalesYearly>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolumeSalesYearly]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VolumeSalesYearly);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
