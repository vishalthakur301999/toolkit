import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import {descopeAuthGuard} from '@descope/angular-sdk';


export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [descopeAuthGuard], // Use the new Descope guard
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
  { path: '**', redirectTo: '' }
];

