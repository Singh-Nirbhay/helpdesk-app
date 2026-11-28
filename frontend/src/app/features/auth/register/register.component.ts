import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import type { ValidatorFn } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { finalize, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';

import type {
  RegisterRequest
} from '../../../core/models/auth.models';

const passwordComplexityValidator: ValidatorFn = control => {
  const password: unknown = control.value;

  // Empty values are handled by Validators.required.
  if (password === '') {
    return null;
  }

  if (typeof password !== 'string') {
    return { passwordComplexity: true };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasNonAlphanumeric = /[^A-Za-z0-9]/.test(password);

  return (
    hasUppercase &&
    hasLowercase &&
    hasDigit &&
    hasNonAlphanumeric
  )
    ? null
    : { passwordComplexity: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSubmitting = signal(false);

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    fullName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(150),
      Validators.pattern(/\S[\s\S]*\S/)
    ]],

    email: ['', [
      Validators.required,
      Validators.email,
      Validators.maxLength(256)
    ]],

    password: ['', [
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(128),
      passwordComplexityValidator
    ]]
  });

  protected submit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set(null);

    this.form.controls.fullName.setValue(
      this.form.controls.fullName.value.trim()
    );

    this.form.controls.email.setValue(
      this.form.controls.email.value.trim()
    );

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: RegisterRequest = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.authService.register(payload)
      .pipe(
        switchMap(() =>
          this.router.navigateByUrl('/dashboard', {
            replaceUrl: true
          }).catch(() => false)
        ),

        takeUntilDestroyed(this.destroyRef),

        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe({
        next: navigated => {
          if (!navigated) {
            this.errorMessage.set(
              'Account created successfully, but unable to open the dashboard.'
            );
          }
        },

        error: (error: unknown) => {
          this.errorMessage.set(
            this.getRegistrationError(error)
          );
        }
      });
  }

  private getRegistrationError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
        case 409:
          return 'Registration could not be completed. Please check your details or try signing in.';

        case 0:
          return 'Unable to connect to the server. Please try again.';

        case 429:
          return 'Too many attempts. Please try again later.';
      }
    }

    return 'Unable to create your account. Please try again.';
  }
}
