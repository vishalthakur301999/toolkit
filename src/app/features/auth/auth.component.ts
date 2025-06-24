import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule, ToastModule, DividerModule],
  providers: [MessageService],
  templateUrl: './auth.component.html',
})
export class AuthComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  authForm: FormGroup;
  isSigningIn = true;
  isLoading = false;

  constructor() {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  toggleAuthMode(): void {
    this.isSigningIn = !this.isSigningIn;
    this.authForm.reset();
  }

  async onSubmit(): Promise<void> {
    if (this.authForm.invalid) return;
    this.isLoading = true;
    const { email, password } = this.authForm.value;

    const { error } = this.isSigningIn
      ? await this.supabase.signInWithEmail(email, password)
      : await this.supabase.signUpWithEmail(email, password);

    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } else {
      if (!this.isSigningIn) {
        this.messageService.add({ severity: 'success', summary: 'Success!', detail: 'Please check your email to verify your account.' });
      }
      // The auth state listener in the service will handle navigation
    }
    this.isLoading = false;
  }

  async onSignInWithPasskey(): Promise<void> {
    this.isLoading = true;
    const { error } = await this.supabase.signInWithPasskey();
    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Passkey Error', detail: error.message });
    }
    this.isLoading = false;
  }
}
