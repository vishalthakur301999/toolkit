import { Component, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignInFlowComponent} from '@descope/angular-sdk'; // Import the component
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, SignInFlowComponent], // Use the Descope component
  template: `
    <div class="flex justify-center items-center h-full">
      <descope-sign-in-flow
        flowId="sign-up-or-in"
        (success)="onSuccess()"
        (error)="onError()"
      ></descope-sign-in-flow>
    </div>
  `
})
export class LoginComponent {
  private router = inject(Router);
  private zone = inject(NgZone);

  onSuccess() {
    // Use NgZone to ensure navigation works correctly from the web component event
    this.zone.run(() => {
      this.router.navigate(['/']);
    });
  }

  onError() {
    console.error('Descope auth error');
  }
}
