import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface HealthResponse {
  status: string;
  utcTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  private readonly http = inject(HttpClient);

  getHealth() {
    return this.http.get<HealthResponse>(
      `${environment.apiUrl}/Health`
    );
  }
}
