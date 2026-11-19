import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth-service';
import { ToastService } from '../toast-service';

// One page used for both "Sign in" and "Create an account" (the route says which)
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-auth-page',
  styleUrl: './auth-page.css',
  templateUrl: './auth-page.html',
})
export class AuthPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  protected isRegister: boolean = this.route.snapshot.data['mode'] === 'register';

  // Where to go after signing in (for example back to checkout). Only allow paths inside our own site.
  protected returnUrl: string | null = (() => {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : null;
  })();

  protected form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true })
  });

  protected message = signal('');
  protected busy = signal(false);

  protected submit(): void {
    const value = this.form.getRawValue();
    const name = value.name.trim();
    const email = value.email.trim();
    const password = value.password;

    // Say exactly what is wrong, and move keyboard focus to that field
    let problem = '';
    let fieldId = '';

    if (this.isRegister && name.length < 2) {
      problem = 'Enter your full name.';
      fieldId = 'accountName';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      problem = 'Enter a valid email, like name@example.com.';
      fieldId = 'accountEmail';
    } else if (this.isRegister && password.length < 8) {
      problem = 'Choose a password with at least 8 characters.';
      fieldId = 'accountPassword';
    } else if (!this.isRegister && password === '') {
      problem = 'Enter your password.';
      fieldId = 'accountPassword';
    }

    if (problem) {
      this.message.set(problem);
      document.getElementById(fieldId)?.focus();
      return;
    }

    this.message.set('');
    this.busy.set(true);

    const request = this.isRegister
      ? this.auth.register({ name, email, password })
      : this.auth.login({ email, password });

    request.subscribe({
      next: (result) => {
        this.busy.set(false);
        const firstName = result.user.name.split(' ')[0];
        this.toast.show(this.isRegister ? 'Welcome, ' + firstName + '! Your account is ready.' : 'Welcome back, ' + firstName + '!');
        this.router.navigateByUrl(this.returnUrl ?? '/account');
      },
      error: (error) => {
        this.busy.set(false);
        this.message.set(error?.error?.error ?? 'Something went wrong. Please try again.');
      }
    });
  }
}
