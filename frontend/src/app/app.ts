import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';

import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {

  protected readonly authService = inject(AuthService);

  protected readonly logoutError = signal<string | null>(null);

  protected async logout(): Promise<void> {
    this.logoutError.set(null);



    try {
      const navigated = await this.authService.logout();

      if (!navigated) {
        this.logoutError.set(
          'Signed out. Please open the sign-in page.'
        );
      }
    } catch {
      this.logoutError.set(
        'Signed out. Please open the sign-in page.'
      );
    }
  }
}
