import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  HealthService,
  HealthResponse
} from './core/services/health.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  private readonly healthService = inject(HealthService);

  health = signal<HealthResponse | null>(null);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.healthService.getHealth().subscribe({
      next: (response) => {
        this.health.set(response);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Unable to connect to the backend');
      }
    });
  }
}
