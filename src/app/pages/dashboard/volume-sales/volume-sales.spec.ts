import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumeSales } from './volume-sales';

describe('VolumeSales', () => {
  let component: VolumeSales;
  let fixture: ComponentFixture<VolumeSales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolumeSales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VolumeSales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
