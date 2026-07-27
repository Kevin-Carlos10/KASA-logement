import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoutienComposant } from './soutien.composant';

describe('SoutienComposant', () => {
  let component: SoutienComposant;
  let fixture: ComponentFixture<SoutienComposant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoutienComposant],
    }).compileComponents();

    fixture = TestBed.createComponent(SoutienComposant);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
