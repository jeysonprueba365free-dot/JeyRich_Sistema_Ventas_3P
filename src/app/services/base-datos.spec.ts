import { TestBed } from '@angular/core/testing';

import { BaseDatos } from './base-datos';

describe('BaseDatos', () => {
  let service: BaseDatos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseDatos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
