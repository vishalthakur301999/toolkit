import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard], // Protect the main layout and its children
    children: [
      { path: '', redirectTo: 'notes', pathMatch: 'full' },
      {
        path: 'notes',
        loadComponent: () => import('./features/notes/notes-list/notes-list.component').then(m => m.NotesListComponent)
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar-view/calendar-view.component').then(m => m.CalendarViewComponent)
      }
    ]
  },
  // Redirect any other path to auth if not logged in, or notes if logged in
  { path: '**', redirectTo: '' }
];
