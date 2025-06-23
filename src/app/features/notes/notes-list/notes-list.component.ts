import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import {PrimeNgModule} from '../../../primeng.module';

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    PrimeNgModule
  ],
  templateUrl: './notes-list.component.html',
  styleUrl: './notes-list.component.scss'
})
export class NotesListComponent { }
