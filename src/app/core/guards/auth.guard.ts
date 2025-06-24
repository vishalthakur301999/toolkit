import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  return supabase.currentUser$.pipe(
    take(1), // Take the first value and complete
    map(user => {
      if (user) {
        return true; // User is logged in, allow access
      }
      // User is not logged in, redirect to auth page
      router.navigate(['/auth']);
      return false;
    })
  );
};
