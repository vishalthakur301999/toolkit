import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DescopeAuthService } from '@descope/angular-sdk';
import { map, take } from 'rxjs';

export const descopeAuthGuard: CanActivateFn = (route, state) => {
  const descopeAuth = inject(DescopeAuthService);
  const router = inject(Router);

  return descopeAuth.session$.pipe(
    take(1),
    map(session => {
      if (session && session.isAuthenticated) {
        return true; // Session is valid, allow access
      }
      router.navigate(['/login']); // No valid session, redirect to login
      return false;
    })
  );
};
