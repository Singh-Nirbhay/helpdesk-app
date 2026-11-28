import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

import type {
  AppRole,
  AuthResponse,
  CurrentUser,
  LoginRequest,
  RegisterRequest
} from '../models/auth.models';


const SESSION_STORAGE_KEY = 'helpdesk.auth.session';
const MAX_TIMER_DELAY_MS = 2_147_483_647;

@Injectable({
  providedIn: 'root'
})
export class AuthService {


  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly authUrl = `${environment.apiUrl}/auth`;

  private expirationTimer: ReturnType<typeof setTimeout> | undefined;
  private logoutNavigation: Promise<boolean> | null = null;

  private readonly _session = signal<AuthResponse | null>(
    this.loadValidSession()
  );

  readonly session = this._session.asReadonly();

  readonly isAuthenticated = computed(() => {
    const session = this._session();

    return session !== null &&
      Date.parse(session.expiresAtUtc) > Date.now();
  });

  readonly userRole = computed<AppRole | null>(() =>
    this.isAuthenticated()
      ? this._session()?.role ?? null
      : null
  );

  constructor() {
    this.scheduleExpiration();

    inject(DestroyRef).onDestroy(() => {
      this.cancelExpirationTimer();
    });
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.authUrl}/login`,
        payload
      )
      .pipe(
        tap(response => this.setSession(response))
      );
  }

  register(
    payload: RegisterRequest
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.authUrl}/register`,
        payload
      )
      .pipe(
        tap(response => this.setSession(response))
      );
  }

  getMe(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(
      `${this.authUrl}/me`
    );
  }

  logout(): Promise<boolean> {
    this.clearSession();

    if (this.logoutNavigation) {
      return this.logoutNavigation;
    }

    this.logoutNavigation = this.router
      .navigate(['/login'], {
        replaceUrl: true
      })
      .finally(() => {
        this.logoutNavigation = null;
      });

    return this.logoutNavigation;
  }

  getToken(): string | null {
    const session = this._session();

    if (
      !session ||
      !(Date.parse(session.expiresAtUtc) > Date.now())
    ) {
      return null;
    }

    return session.accessToken;
  }

  private setSession(response: AuthResponse): void {
    if (
      !this.isAuthResponse(response) ||
      !(Date.parse(response.expiresAtUtc) > Date.now())
    ) {
      throw new Error(
        'Invalid authentication response from the server.'
      );
    }

    const session = this.createSessionSnapshot(response);

    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(session)
      );
    } catch {
      // Fall back to in-memory state if storage is unavailable.
      this.removeStoredSession();
    }

    this._session.set(session);
    this.scheduleExpiration();
  }

  private createSessionSnapshot(
    response: AuthResponse
  ): AuthResponse {
    return Object.freeze({
      accessToken: response.accessToken,
      expiresAtUtc: response.expiresAtUtc,
      email: response.email,
      fullName: response.fullName,
      role: response.role
    });
  }

  private loadValidSession(): AuthResponse | null {
    try {
      const stored = sessionStorage.getItem(
        SESSION_STORAGE_KEY
      );

      if (stored === null) {
        return null;
      }

      const parsed: unknown = JSON.parse(stored);

      if (!this.isAuthResponse(parsed) ||
        !(Date.parse(parsed.expiresAtUtc) > Date.now())) {
        this.removeStoredSession();
        return null;
      }

      return this.createSessionSnapshot(parsed);

    } catch {
      this.removeStoredSession();
      return null;
    }
  }

  private isAuthResponse(value: unknown): value is AuthResponse {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const session = value as Record<string, unknown>;

    return (
      typeof session['accessToken'] === 'string' &&
      session['accessToken'].trim().length > 0 &&

      typeof session['expiresAtUtc'] === 'string' &&
      Number.isFinite(Date.parse(session['expiresAtUtc'])) &&

      typeof session['email'] === 'string' &&
      session['email'].trim().length > 0 &&

      typeof session['fullName'] === 'string' &&
      session['fullName'].trim().length > 0 &&

      this.isAppRole(session['role'])
    );
  }

  private isAppRole(value: unknown): value is AppRole {
    return value === 'Customer' ||
      value === 'Agent' ||
      value === 'Manager' ||
      value === 'Admin';
  }

  private scheduleExpiration(): void {
    this.cancelExpirationTimer();

    const session = this._session();

    if (!session) {
      return;
    }

    const remaining =
      Date.parse(session.expiresAtUtc) - Date.now();

    if (!Number.isFinite(remaining) || remaining <= 0) {
      void this.logout().catch(() => {
        console.error(
          'Unable to navigate to login after session expiration.'
        );
      });

      return;
    }

    this.expirationTimer = setTimeout(() => {
      this.scheduleExpiration();
    }, Math.min(remaining, MAX_TIMER_DELAY_MS));
  }

  private cancelExpirationTimer(): void {
    if (this.expirationTimer !== undefined) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = undefined;
    }
  }

  private clearSession(): void {
    this.cancelExpirationTimer();
    this._session.set(null);
    this.removeStoredSession();
  }

  private removeStoredSession(): void {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Storage may be unavailable or blocked by the browser.
      // In-memory authentication state remains authoritative.
    }
  }
}
