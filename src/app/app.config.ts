import {ApplicationConfig, importProvidersFrom, provideZoneChangeDetection} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import {MessageService} from 'primeng/api';
import { DescopeAuthModule } from '@descope/angular-sdk';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimations(),
    MessageService,
    importProvidersFrom(
      DescopeAuthModule.forRoot({ projectId: 'P2yxI9fULUpvg8EXnAWZaTYOtQCx' })
    ),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          prefix: 'p',
          cssLayer: { name: 'primeng' } // optional tweaks
        }
      }
    })],
};
