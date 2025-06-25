import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Keep these interfaces
export interface NoteDbo {
  id?: string;
  user_id?: string; // Add this if you want to link notes to users
  encrypted_content: string;
  iv: string;
  salt: string;
  created_at?: string;
}

export interface EncryptedDekDbo {
  user_id: string;
  encrypted_dek: string;
  iv: string;
  salt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    }
  }

  // We need to pass the user's JWT from Descope to Supabase
  // to authenticate database requests.
  private getSupabaseClient(jwt?: string): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    if (jwt) {
      return createClient(environment.supabaseUrl, environment.supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      });
    }

    return this.supabase;
  }
  // --- E2EE Key Management Methods ---
  // --- E2EE Key Management Methods ---
  async getEncryptedDek(jwt: string): Promise<EncryptedDekDbo | null> {
    const supabase = this.getSupabaseClient(jwt);
    const { data, error } = await supabase.from('user_keys').select('*').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // CORRECTED: Takes 2 arguments
  async saveEncryptedDek(jwt: string, dekData: EncryptedDekDbo): Promise<{ error: any }> {
    const supabase = this.getSupabaseClient(jwt);
    const { error } = await supabase.from('user_keys').insert(dekData);
    return { error };
  }

  // --- Notes Methods ---
  async getNotes(jwt: string): Promise<NoteDbo[]> {
    const supabase = this.getSupabaseClient(jwt);
    const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as NoteDbo[];
  }

  // CORRECTED: Takes 2 arguments
  async addNote(jwt: string, note: NoteDbo): Promise<any> {
    const supabase = this.getSupabaseClient(jwt);
    const { data, error } = await supabase.from('notes').insert([note]).select();
    if (error) throw error;
    return data?.[0];
  }

  // CORRECTED: Takes 3 arguments
  async updateNote(jwt: string, id: string, note: Partial<NoteDbo>): Promise<any> {
    const supabase = this.getSupabaseClient(jwt);
    const { data, error } = await supabase.from('notes').update(note).eq('id', id).select();
    if (error) throw error;
    return data?.[0];
  }

  // CORRECTED: Takes 2 arguments
  async deleteNote(jwt: string, id: string): Promise<void> {
    const supabase = this.getSupabaseClient(jwt);
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
  }
}
