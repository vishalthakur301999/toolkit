import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CalendarModule } from 'primeng/calendar';

@NgModule({
  exports: [
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    CalendarModule
  ]
})
export class PrimeNgModule { }
