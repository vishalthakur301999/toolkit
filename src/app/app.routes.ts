import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'notes', pathMatch: 'full' },
      {
        path: 'notes',
        // Lazy-load the NotesListComponent directly
        loadComponent: () => import('./features/notes/notes-list/notes-list.component').then(m => m.NotesListComponent)
      },
      {
        path: 'calendar',
        // Lazy-load the CalendarViewComponent directly
        loadComponent: () => import('./features/calendar/calendar-view/calendar-view.component').then(m => m.CalendarViewComponent)
      }
    ]
  }
];
