import {Component, inject} from '@angular/core';
import {RouterOutlet, RouterLink, RouterLinkActive, Router} from '@angular/router';
import {PrimeNgModule} from '../../primeng.module';
import {SupabaseService} from '../../core/services/supabase.service';
import {ToastModule} from 'primeng/toast';
import {MessageService} from 'primeng/api';
import { DescopeAuthService } from '@descope/angular-sdk';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    PrimeNgModule,
    ToastModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private descopeAuth = inject(DescopeAuthService);

  signOut() {
    descope.logout(); // This will clear the session cookie or token
  }
}
