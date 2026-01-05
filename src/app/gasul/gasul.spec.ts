import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Gasul } from './gasul';

describe('Gasul', () => {
  let component: Gasul;
  let fixture: ComponentFixture<Gasul>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Gasul]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Gasul);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
