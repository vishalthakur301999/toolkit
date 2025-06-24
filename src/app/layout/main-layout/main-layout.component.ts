import {Component, inject} from '@angular/core';
import {RouterOutlet, RouterLink, RouterLinkActive, Router} from '@angular/router';
import {PrimeNgModule} from '../../primeng.module';
import {SupabaseService} from '../../core/services/supabase.service';
import {ToastModule} from 'primeng/toast';
import {MessageService} from 'primeng/api';

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
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private messageService = inject(MessageService); // Inject MessageService

  async signOut(): Promise<void> {
    await this.supabase.signOut();
    // The auth state listener will handle redirecting
  }

  async onRegisterPasskey(): Promise<void> {
    const { error } = await this.supabase.registerPasskey();
    if (!error) {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Passkey registered successfully!' });
    }
    // The service already handles showing an error message on failure
  }
}
