import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, combineLatest, switchMap, of } from 'rxjs';
import {DescopeAuthService, DescopeUser} from '@descope/angular-sdk';
// CORRECTED: Import UserResponse and the DescopeSession type correctly
import type { UserResponse } from '@descope/web-js-sdk';
import { DescopeSession } from '@descope/angular-sdk';
// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

// App Services
import { SupabaseService, NoteDbo, EncryptedDekDbo } from '../../../core/services/supabase.service';
import { CryptoService } from '../../../core/services/crypto.service';

export interface Note {
  id: string;
  title: string;
  content: string;
}

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, CardModule, ButtonModule, DialogModule,
    InputTextModule, TextareaModule, ToastModule, ConfirmDialogModule, ProgressSpinnerModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './notes-list.component.html',
  styleUrl: './notes-list.component.scss'
})
export class NotesListComponent implements OnInit, OnDestroy {
  // Injected services
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private cryptoService = inject(CryptoService);
  private descopeService = inject(DescopeAuthService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  private destroy$ = new Subject<void>();
  private dataKey = '';

  // State
  notes: Note[] = [];
  isLoading = true;
  needsToSetup = false;

  // Form and Dialog
  noteForm!: FormGroup;
  displayDialog = false;
  isSaving = false;
  currentNoteId: string | null = null;

  private currentSession: DescopeSession | null = null;
  private currentUser: DescopeUser | null = null;

  ngOnInit(): void {
    this.noteForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
    });

    this.descopeService.session$.pipe(takeUntil(this.destroy$)).subscribe(session => {
      this.currentSession = session;
      if (session?.isAuthenticated) {
        this.initializeNotes();
      } else {
        this.cleanupState();
      }
    });

    this.descopeService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cleanupState(): void {
    this.isLoading = false;
    this.notes = [];
    this.dataKey = '';
    this.currentSession = null;
    this.currentUser = null;
    sessionStorage.removeItem('noteDataKey');
  }

  async initializeNotes(): Promise<void> {
    const sessionToken = this.currentSession?.sessionToken;
    if (!sessionToken) return;
    this.isLoading = true;
    const sessionKey = sessionStorage.getItem('noteDataKey');
    if (sessionKey) {
      this.dataKey = sessionKey;
      await this.loadNotes();
      return;
    }
    const dekDbo = await this.supabaseService.getEncryptedDek(sessionToken);
    if (dekDbo) {
      await this.promptForMasterPasswordAndUnlock(dekDbo);
    } else {
      this.isLoading = false;
      this.needsToSetup = true;
    }
  }

  async promptForMasterPasswordAndUnlock(dekDbo: EncryptedDekDbo): Promise<void> {
    const masterPassword = window.prompt("Please enter your Master Password to unlock your notes:");
    if (!masterPassword) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Master Password is required.' });
      this.isLoading = false;
      return;}
    try {
      this.dataKey = await this.cryptoService.decrypt(dekDbo.encrypted_dek, dekDbo.iv, dekDbo.salt, masterPassword);
      sessionStorage.setItem('noteDataKey', this.dataKey);
      await this.loadNotes();
    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Decryption Failed', detail: 'Incorrect Master Password.' });
      this.isLoading = false;
    }
  }


  async setupMasterPassword(): Promise<void> {
    const masterPassword = window.prompt("Create a strong Master Password...");
    if (!masterPassword || masterPassword.length < 8) { /* ... */ return; }

    // CORRECTED: Get user ID from the 'sub' claim of the JWT
    const userId = this.currentUser?.user?.userId;
    const sessionToken = this.currentSession?.sessionToken;
    if (!userId || !sessionToken) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'User session not found.' });
      return;
    }
    this.isLoading = true;
    this.dataKey = bufferToBase64(crypto.getRandomValues(new Uint8Array(32)));
    const { encryptedContent, iv, salt } = await this.cryptoService.encrypt(this.dataKey, masterPassword);

    const dekToSave: EncryptedDekDbo = { user_id: userId, encrypted_dek: encryptedContent, iv, salt };

    const { error } = await this.supabaseService.saveEncryptedDek(sessionToken, dekToSave);

    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Setup Failed', detail: 'Could not save your encrypted key.' });
      this.isLoading = false;
    } else {
      this.messageService.add({ severity: 'success', summary: 'Setup Complete!', detail: 'You can now create notes.' });
      sessionStorage.setItem('noteDataKey', this.dataKey);
      this.needsToSetup = false;
      await this.loadNotes();
    }
  }

  async loadNotes(): Promise<void> {
    const sessionToken = this.currentSession?.sessionToken;
    if (!this.dataKey || !sessionToken) {
      this.isLoading = false;
      return;
    };

    this.isLoading = true;
    try {
      const dbNotes = await this.supabaseService.getNotes(sessionToken);
      const decryptedNotes: Note[] = [];

      for (const dbNote of dbNotes) {
        try {
          const decrypted = await this.cryptoService.decrypt(dbNote.encrypted_content, dbNote.iv, dbNote.salt, this.dataKey);
          decryptedNotes.push({ id: dbNote.id!, ...JSON.parse(decrypted) });
        } catch (e) {
          decryptedNotes.push({ id: dbNote.id!, title: 'Decryption Failed', content: 'Could not decrypt note.' });
        }
      }
      this.notes = decryptedNotes;
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load notes.' });
      this.notes = [];
    } finally {
      this.isLoading = false;
    }
  }

  showAddNoteDialog(): void {
    if (!this.dataKey) {
      this.messageService.add({ severity: 'warn', summary: 'Setup Required', detail: 'Please set up your Master Password first.' });
      return;
    }
    this.currentNoteId = null;
    this.noteForm.reset();
    this.displayDialog = true;
  }

  showEditNoteDialog(note: Note): void {
    this.currentNoteId = note.id;
    this.noteForm.setValue({ title: note.title, content: note.content });
    this.displayDialog = true;
  }

  async saveNote(): Promise<void> {
    if (this.noteForm.invalid || !this.dataKey || !this.currentSession?.sessionToken) return;

    this.isSaving = true;
    const { title, content } = this.noteForm.value;
    const noteContent = JSON.stringify({ title, content });
    const userId = this.currentUser?.user?.userId;
    const sessionToken = this.currentSession.sessionToken;

    try {
      const { encryptedContent, iv, salt } = await this.cryptoService.encrypt(noteContent, this.dataKey);

      const noteToSave: NoteDbo = {
        user_id: userId,
        encrypted_content: encryptedContent,
        iv,
        salt
      };

      if (this.currentNoteId) {
        await this.supabaseService.updateNote(sessionToken, this.currentNoteId, noteToSave);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Note updated!' });
      } else {
        await this.supabaseService.addNote(sessionToken, noteToSave);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Note added!' });
      }
      this.displayDialog = false;
      await this.loadNotes();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Save Failed', detail: 'Could not save the note.' });
    } finally {
      this.isSaving = false;
    }
  }

  confirmDelete(noteId: string): void {
    const sessionToken = this.currentSession?.sessionToken;
    if (!sessionToken) return;

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this note?',
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.supabaseService.deleteNote(sessionToken, noteId);
          this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Note deleted.' });
          await this.loadNotes();
        } catch(error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not delete note.' });
        }
      }
    });
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
