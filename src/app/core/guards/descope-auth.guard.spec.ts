import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { descopeAuthGuard } from './descope-auth.guard';

describe('descopeAuthGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => descopeAuthGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
