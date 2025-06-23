import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import {PrimeNgModule} from '../../../primeng.module';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [
    CommonModule, // For directives like *ngIf
    FormsModule,    // For ngModel
    CalendarModule,
    PrimeNgModule,
    CardModule
  ],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent {
  date: Date | undefined;
}
