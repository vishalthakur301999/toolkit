import { Injectable, Inject, PLATFORM_ID, NgZone, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, User, AuthError } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { MessageService } from 'primeng/api'; // Import MessageService

export interface NoteDbo {
  id?: string;
  encrypted_content: string;
  iv: string;
  salt: string;
  created_at?: string;
}

// New DBO for the user_keys table
export interface EncryptedDekDbo {
  id?: string; // Should match the user's ID
  encrypted_dek: string;
  salt: string;
  // The IV for the DEK is part of the encrypted_dek string in this setup
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  // The Supabase client can now be null if on the server
  private supabase: SupabaseClient | null = null;
  private _currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$ = this._currentUser.asObservable();

  // --- Dependency Injection ---
  private zone = inject(NgZone);
  private messageService = inject(MessageService);

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

      this.supabase.auth.getSession().then(({ data: { session } }) => {
        this._currentUser.next(session?.user ?? null);
      });

      this.supabase.auth.onAuthStateChange((event, session) => {
        this.zone.run(() => {
          this._currentUser.next(session?.user ?? null);
        });
      });
    }
  }

  private getSupabaseClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client is not initialized.');
    }
    return this.supabase;
  }

  // --- Auth Methods ---

  async signUpWithEmail(email: string, password: string): Promise<{ error: AuthError | null }> {
    const supabase = this.getSupabaseClient();
    // Supabase automatically sends a verification email if enabled in your project settings
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }

  async signInWithEmail(email: string, password: string): Promise<{ error: AuthError | null }> {
    const supabase = this.getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async signOut(): Promise<void> {
    const supabase = this.getSupabaseClient();
    await supabase.auth.signOut();
    // Also clear the session key when signing out
    sessionStorage.removeItem('noteEncryptionKey');
  }

  // --- Passkey Methods ---

  async registerPasskey(): Promise<{ error: AuthError | null }> {
    const supabase = this.getSupabaseClient();
    try {
      // 1. Generate registration options from Supabase Auth
      // @ts-ignore
      const options = await supabase.auth.generateRegistrationOptions();

      // 2. Use these options to register the passkey on the client-side
      // @ts-ignore
      await supabase.auth.registerWithPasskey(options);

      // Use the injected messageService
      this.messageService.add({ severity: 'success', summary: 'Passkey Registered!', detail: 'You can now sign in using your passkey.' });
      return { error: null };
    } catch (e: any) {
      // The error object might not be a standard AuthError, so we cast it
      const error = e as AuthError;
      this.messageService.add({ severity: 'error', summary: 'Registration Failed', detail: error.message });
      return { error };
    }
  }

  async signInWithPasskey(): Promise<{ error: AuthError | null }> {
    const supabase = this.getSupabaseClient();
    try {
      // 1. Generate authentication options from Supabase Auth
      // @ts-ignore
      const options = await supabase.auth.generateAuthenticationOptions();

      // 2. Use these options to get a signed challenge from the browser
      // @ts-ignore
      const passkeyCredential = await supabase.auth.signInWithPasskey(options);

      // 3. Invoke your Edge Function with the signed credential
      const { error: invokeError } = await supabase.functions.invoke('auth-passkey', {
        body: { passkey: passkeyCredential }
      });

      if (invokeError) throw invokeError;

      // onAuthStateChange will handle the login success
      return { error: null };
    } catch (e: any) {
      const error = e as AuthError;
      this.messageService.add({ severity: 'error', summary: 'Sign-In Failed', detail: error.message });
      return { error };
    }
  }

  // --- E2EE Key Management Methods ---

  async getEncryptedDek(): Promise<EncryptedDekDbo | null> {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase.from('user_keys').select('*').single();
    if (error && error.code !== 'PGRST116') { // PGRST116 = 'single row not found'
      throw error;
    }
    return data;
  }

  async saveEncryptedDek(dekData: EncryptedDekDbo): Promise<{ error: any }> {
    const supabase = this.getSupabaseClient();
    const { error } = await supabase.from('user_keys').insert(dekData);
    return { error };
  }

  async addNote(note: NoteDbo) {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase
      .from('notes')
      .insert([note])
      .select();
    if (error) throw error;
    return data?.[0];
  }

  async getNotes() {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as NoteDbo[];
  }

  async updateNote(id: string, note: Partial<NoteDbo>) {
    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase
      .from('notes')
      .update(note)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  }

  async deleteNote(id: string) {
    const supabase = this.getSupabaseClient();
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
