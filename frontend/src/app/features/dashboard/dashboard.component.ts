import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

import type { OnInit } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';

import type {
  CurrentUser
} from '../../core/models/auth.models';

type DashboardState =
  | { status: 'loading' }
  | { status: 'success'; user: CurrentUser }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<DashboardState>({
    status: 'loading'
  });

  ngOnInit(): void {
    this.authService.getMe()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: user => {
          this.state.set({
            status: 'success',
            user
          });
        },

        error: (error: unknown) => {
          this.state.set({
            status: 'error',
            message: this.getErrorMessage(error)
          });
        }
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 401:
          return 'Your session is no longer valid. Please sign in again.';

        case 403:
          return 'You do not have permission to access this resource.';

        case 0:
          return 'Unable to connect to the server.';
      }
    }

    return 'Unable to retrieve your account information.';
  }
}
