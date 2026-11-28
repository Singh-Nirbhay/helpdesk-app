import { TestBed } from '@angular/core/testing';

import {
  HttpClient,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import type { AuthResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let currentSession: AuthResponse | null;

  const apiUrl = environment.apiUrl;

  const session: AuthResponse = {
    accessToken: 'test-token',
    expiresAtUtc: '2099-01-01T00:00:00Z',
    email: 'agent@helpdesk.local',
    fullName: 'Demo Agent',
    role: 'Agent'
  };

  const authMock = {
    session: vi.fn(() => currentSession),

    getToken: vi.fn(() =>
      currentSession?.accessToken ?? null
    ),

    logout: vi.fn(async () => {
      currentSession = null;
      return true;
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();

    currentSession = session;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),

        provideHttpClient(
          withInterceptors([authInterceptor])
        ),

        provideHttpClientTesting(),

        {
          provide: AuthService,
          useValue: authMock
        }
      ]
    });

    http = TestBed.inject(HttpClient);

    httpTesting = TestBed.inject(
      HttpTestingController
    );
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  it('attaches the token to API requests', async () => {
    const url = `${apiUrl}/auth/me`;

    const result = firstValueFrom(http.get(url));

    const request = httpTesting.expectOne(url);

    expect(
      request.request.headers.get('Authorization')
    ).toBe('Bearer test-token');

    request.flush({});

    await result;
  });

  it('does not attach a token without a session', async () => {
    currentSession = null;

    const url = `${apiUrl}/lookups`;

    const result = firstValueFrom(http.get(url));

    const request = httpTesting.expectOne(url);

    expect(
      request.request.headers.has('Authorization')
    ).toBe(false);

    request.flush({});

    await result;
  });

  it.each([
    'https://example.com/data',
    `${apiUrl}-other/data`
  ])('leaves unrelated requests untouched: %s', async url => {
    const result = firstValueFrom(http.get(url));

    const assertion = expect(result).rejects
      .toMatchObject({ status: 401 });

    const request = httpTesting.expectOne(url);

    expect(
      request.request.headers.has('Authorization')
    ).toBe(false);

    request.flush(null, {
      status: 401,
      statusText: 'Unauthorized'
    });

    await assertion;

    expect(authMock.logout).not.toHaveBeenCalled();
  });

  it('logs out when a protected API returns 401', async () => {
    const url = `${apiUrl}/auth/me`;

    const result = firstValueFrom(http.get(url));

    const assertion = expect(result).rejects
      .toMatchObject({ status: 401 });

    httpTesting.expectOne(url).flush(null, {
      status: 401,
      statusText: 'Unauthorized'
    });

    await assertion;

    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(currentSession).toBeNull();
  });

  it.each([
    '/auth/login',
    '/auth/register?source=test'
  ])('does not log out for 401 from %s', async endpoint => {
    const url = `${apiUrl}${endpoint}`;

    const result = firstValueFrom(http.post(url, {}));

    const assertion = expect(result).rejects
      .toMatchObject({ status: 401 });

    httpTesting.expectOne(url).flush(null, {
      status: 401,
      statusText: 'Unauthorized'
    });

    await assertion;

    expect(authMock.logout).not.toHaveBeenCalled();
  });

  it('preserves the session when the API returns 403', async () => {
    const url = `${apiUrl}/tickets`;

    const result = firstValueFrom(http.get(url));

    const assertion = expect(result).rejects
      .toMatchObject({ status: 403 });

    httpTesting.expectOne(url).flush(null, {
      status: 403,
      statusText: 'Forbidden'
    });

    await assertion;

    expect(authMock.logout).not.toHaveBeenCalled();
    expect(currentSession).toBe(session);
  });

  it('does not clear a newer session for an older 401', async () => {
    const url = `${apiUrl}/auth/me`;

    const result = firstValueFrom(http.get(url));

    const assertion = expect(result).rejects
      .toMatchObject({ status: 401 });

    const request = httpTesting.expectOne(url);

    // Simulate another successful login.
    const newSession: AuthResponse = {
      ...session,
      accessToken: 'new-test-token'
    };

    currentSession = newSession;

    request.flush(null, {
      status: 401,
      statusText: 'Unauthorized'
    });

    await assertion;

    expect(authMock.logout).not.toHaveBeenCalled();
    expect(currentSession).toBe(newSession);
  });
});
