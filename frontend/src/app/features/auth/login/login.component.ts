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

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { finalize, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';

import type {
  LoginRequest
} from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSubmitting = signal(false);

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  protected submit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: LoginRequest = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.authService.login(payload)
      .pipe(
        switchMap(() =>
          this.router.navigateByUrl(
            this.getReturnUrl(),
            { replaceUrl: true }
          ).catch(() => false)
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
              'Signed in successfully, but unable to open the requested page.'
            );
          }
        },

        error: (error: unknown) => {
          this.errorMessage.set(
            this.getLoginError(error)
          );
        }
      });
  }

  private getReturnUrl(): string {
    const returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl');

    if (
      !returnUrl ||
      !returnUrl.startsWith('/') ||
      returnUrl.startsWith('//')
    ) {
      return '/dashboard';
    }

    try {
      const path = decodeURIComponent(
        returnUrl.split(/[?#]/, 1)[0]
      );

      if (
        path.startsWith('//') ||
        path.includes('\\') ||
        /^\/(login|register)(?:[;/]|$)/i.test(path)
      ) {
        return '/dashboard';
      }

      return returnUrl;

    } catch {
      return '/dashboard';
    }
  }

  private getLoginError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 401:
          return 'Invalid email or password';

        case 400:
          return 'Please check your email and password.';

        case 0:
          return 'Unable to connect to the server. Please try again.';

        case 429:
          return 'Too many attempts. Please try again later.';
      }
    }

    return 'Unable to sign in. Please try again.';
  }
}
