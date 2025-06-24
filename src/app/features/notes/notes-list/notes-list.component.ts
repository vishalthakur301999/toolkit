import {Component, OnInit, inject, afterNextRender, NgZone} from '@angular/core'; // No OnDestroy needed now
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// PrimeNG Modules...
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
import {SupabaseService, NoteDbo, EncryptedDekDbo} from '../../../core/services/supabase.service';
import { CryptoService } from '../../../core/services/crypto.service';
import {Subject, takeUntil} from 'rxjs';

export interface Note {
  id: string;
  title: string;
  content: string;
}

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './notes-list.component.html',
  styleUrl: './notes-list.component.scss'
})
export class NotesListComponent implements OnInit {
  // Injected services...
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private cryptoService = inject(CryptoService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private zone = inject(NgZone); // Inject NgZone
  private destroy$ = new Subject<void>();
  private dataKey = ''; // The plaintext Data Encryption Key

  // State Management Properties
  notes: Note[] = [];
  isLoading = true;
  needsToSetup = false;

  // Form and Dialog Properties
  noteForm!: FormGroup;
  displayDialog = false;
  isSaving = false;
  currentNoteId: string | null = null;
  encryptionKey = '';

  constructor() {}

  ngOnInit(): void {
    this.noteForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
    });
    setTimeout(() => this.promptForKeyAndLoad(true), 0);
    this.supabaseService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          // User is logged in, start the key retrieval process
          this.initializeNotes();
        } else {
          // User is logged out, clear the state
          this.isLoading = false;
          this.notes = [];
          this.dataKey = '';
          sessionStorage.removeItem('noteDataKey');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async initializeNotes(): Promise<void> {
    this.isLoading = true;
    const sessionKey = sessionStorage.getItem('noteDataKey');

    if (sessionKey) {
      this.dataKey = sessionKey;
      await this.loadNotes();
      return;
    }

    // If no key in session, check the database
    const dekDbo = await this.supabaseService.getEncryptedDek();
    if (dekDbo) {
      // Key exists in DB, prompt for master password to unlock it
      const masterPassword = window.prompt("Please enter your Master Password to unlock your notes:");
      if (!masterPassword) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Master Password is required.' });
        this.isLoading = false;
        return;
      }
      try {
        this.dataKey = await this.cryptoService.decrypt(dekDbo.encrypted_dek,'', dekDbo.salt, masterPassword);
        sessionStorage.setItem('noteDataKey', this.dataKey);
        await this.loadNotes();
      } catch (e) {
        this.messageService.add({ severity: 'error', summary: 'Decryption Failed', detail: 'Incorrect Master Password.' });
        this.isLoading = false;
      }
    } else {
      // First time user, needs to set up their master password and key
      this.isLoading = false;
      this.needsToSetup = true;
    }
  }

  async setupMasterPassword(): Promise<void> {
    const masterPassword = window.prompt("Create a strong Master Password. This cannot be recovered! Write it down.");
    if (!masterPassword || masterPassword.length < 8) {
      this.messageService.add({ severity: 'warn', summary: 'Password too short', detail: 'Master password must be at least 8 characters.' });
      return;
    }

    this.isLoading = true;
    // 1. Generate new random Data Encryption Key (DEK)
    this.dataKey = bufferToBase64(crypto.getRandomValues(new Uint8Array(32)));

    // 2. Encrypt the new DEK with the master password
    const { encryptedContent, salt } = await this.cryptoService.encrypt(this.dataKey, masterPassword);

    // 3. Save the encrypted DEK to the database
    const dekToSave: EncryptedDekDbo = { encrypted_dek: encryptedContent, salt };
    const { error } = await this.supabaseService.saveEncryptedDek(dekToSave);

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
  /**
   * This is now the single function to get a key and load notes.
   * @param isInitialLoad - A flag to differentiate the first automatic prompt from user clicks.
   */
  async promptForKeyAndLoad(isInitialLoad = false): Promise<void> {
    const promptMessage = isInitialLoad
      ? "Please enter your encryption key to load notes:"
      : "Please enter a new or existing encryption key:";

    const password = window.prompt(promptMessage);

    if (!password) {
      this.messageService.add({ severity: 'warn', summary: 'Cancelled', detail: 'An encryption key is required.' });
      // If it's the initial load and they cancel, stop the spinner.
      if (isInitialLoad) {
        this.isLoading = false;
      }
      return;
    }

    this.encryptionKey = password;

    // Set loading state immediately before starting async work
    this.isLoading = true;

    // Use zone.run() to ensure the async operation and its state changes
    // are properly tracked by Angular for change detection.
    this.zone.run(async () => {
      await this.loadNotes();
    });
  }

  async loadNotes(): Promise<void> {
    if (!this.encryptionKey) {
      this.isLoading = false; // Should not happen with the new flow, but good practice
      return;
    }

    try {
      const dbNotes = await this.supabaseService.getNotes();
      const decryptedNotes: Note[] = [];

      for (const dbNote of dbNotes) {
        try {
          const decrypted = await this.cryptoService.decrypt(dbNote.encrypted_content, dbNote.iv, dbNote.salt, this.encryptionKey);
          decryptedNotes.push({ id: dbNote.id!, ...JSON.parse(decrypted) });
        } catch (e) {
          decryptedNotes.push({ id: dbNote.id!, title: 'Decryption Failed', content: 'Could not decrypt this note. Incorrect key?' });
        }
      }
      this.notes = decryptedNotes;
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load notes.' });
      this.notes = [];
    } finally {
      this.isLoading = false; // This will now correctly trigger a UI update
    }
  }

  // All other methods (showAddNoteDialog, saveNote, etc.) are now simpler
  // because they can rely on the robust promptForKeyAndLoad function.
  showAddNoteDialog(): void {
    if (!this.encryptionKey) {
      this.messageService.add({ severity: 'warn', summary: 'Set Key First', detail: 'Please set the encryption key before adding a note.' });
      this.promptForKeyAndLoad();
      return;
    }
    this.currentNoteId = null;
    this.noteForm.reset();
    this.displayDialog = true;
  }

  // The rest of your methods (showEditNoteDialog, saveNote, confirmDelete)
  // remain EXACTLY the same. They will correctly call the updated loadNotes().
  showEditNoteDialog(note: Note): void {
    this.currentNoteId = note.id;
    this.noteForm.setValue({ title: note.title, content: note.content });
    this.displayDialog = true;
  }

  async saveNote(): Promise<void> {
    if (this.noteForm.invalid) return;

    this.isSaving = true;
    const { title, content } = this.noteForm.value;
    const noteContent = JSON.stringify({ title, content });

    try {
      const { encryptedContent, iv, salt } = await this.cryptoService.encrypt(noteContent, this.encryptionKey);
      const noteToSave: NoteDbo = { encrypted_content: encryptedContent, iv, salt };

      if (this.currentNoteId) {
        await this.supabaseService.updateNote(this.currentNoteId, noteToSave);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Note updated!' });
      } else {
        await this.supabaseService.addNote(noteToSave);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Note added!' });
      }
      this.displayDialog = false;
      await this.loadNotes();
    } catch (error) {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not save note.' });
    } finally {
      this.isSaving = false;
    }
  }

  confirmDelete(noteId: string): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this note?',
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.supabaseService.deleteNote(noteId);
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
