import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { provideRouter, Router } from '@angular/router';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import type { AuthResponse } from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  const authUrl = `${environment.apiUrl}/auth`;
  const storageKey = 'helpdesk.auth.session';

  const credentials = {
    email: 'agent@helpdesk.local',
    password: 'test-password'
  };

  function createResponse(): AuthResponse {
    return {
      accessToken: 'test-token',
      expiresAtUtc: new Date(
        Date.now() + 60_000
      ).toISOString(),
      email: credentials.email,
      fullName: 'Demo Agent',
      role: 'Agent'
    };
  }

  beforeEach(() => {
    sessionStorage.removeItem(storageKey);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
    sessionStorage.removeItem(storageKey);
    vi.restoreAllMocks();
  });

  it('establishes a session after successful login', async () => {
    const response = createResponse();

    const result = firstValueFrom(
      service.login(credentials)
    );

    const request = httpTesting.expectOne(
      `${authUrl}/login`
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);

    request.flush(response);

    expect(await result).toEqual(response);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.userRole()).toBe('Agent');
    expect(service.getToken()).toBe(response.accessToken);

    expect(sessionStorage.getItem(storageKey))
      .toBe(JSON.stringify(response));
  });

  it('does not establish a session after failed login', async () => {
    const result = firstValueFrom(
      service.login(credentials)
    );

    const assertion = expect(result).rejects
      .toMatchObject({ status: 401 });

    httpTesting.expectOne(`${authUrl}/login`).flush(
      { message: 'Invalid email or password' },
      { status: 401, statusText: 'Unauthorized' }
    );

    await assertion;

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('rejects an already expired authentication response', async () => {
    const response: AuthResponse = {
      ...createResponse(),
      expiresAtUtc: new Date(Date.now() - 1000)
        .toISOString()
    };

    const result = firstValueFrom(
      service.login(credentials)
    );

    const assertion = expect(result).rejects.toThrow(
      'Invalid authentication response from the server.'
    );

    httpTesting.expectOne(`${authUrl}/login`)
      .flush(response);

    await assertion;

    expect(service.session()).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it('clears authentication state during logout', async () => {
    const result = firstValueFrom(
      service.login(credentials)
    );

    httpTesting.expectOne(`${authUrl}/login`)
      .flush(createResponse());

    await result;

    const router = TestBed.inject(Router);

    const navigate = vi.spyOn(router, 'navigate')
      .mockResolvedValue(true);

    await service.logout();

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.userRole()).toBeNull();
    expect(service.getToken()).toBeNull();

    expect(sessionStorage.getItem(storageKey)).toBeNull();

    expect(navigate).toHaveBeenCalledWith(
      ['/login'],
      { replaceUrl: true }
    );
  });

  it('clears the session and redirects when the token expires',
    async () => {

      vi.useFakeTimers();

      try {
        const router = TestBed.inject(Router);

        const navigate = vi.spyOn(router, 'navigate')
          .mockResolvedValue(true);

        const payload = {
          email: 'agent@helpdesk.local',
          password: 'test-password'
        };

        const response: AuthResponse = {
          accessToken: 'test-token',
          expiresAtUtc: new Date(
            Date.now() + 1000
          ).toISOString(),
          email: payload.email,
          fullName: 'Demo Agent',
          role: 'Agent'
        };

        const result = firstValueFrom(
          service.login(payload)
        );

        httpTesting.expectOne(`${authUrl}/login`)
          .flush(response);

        await result;

        expect(service.isAuthenticated()).toBe(true);

        await vi.advanceTimersByTimeAsync(1000);

        expect(service.session()).toBeNull();
        expect(service.isAuthenticated()).toBe(false);
        expect(service.getToken()).toBeNull();

        expect(sessionStorage.getItem(storageKey))
          .toBeNull();

        expect(navigate).toHaveBeenCalledWith(
          ['/login'],
          { replaceUrl: true }
        );

      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('reuses an in-progress logout navigation', async () => {

    const router = TestBed.inject(Router);

    let completeNavigation!: (value: boolean) => void;

    const pendingNavigation = new Promise<boolean>(
      resolve => {
        completeNavigation = resolve;
      }
    );

    const navigate = vi.spyOn(router, 'navigate')
      .mockReturnValue(pendingNavigation);

    const firstLogout = service.logout();
    const secondLogout = service.logout();

    expect(firstLogout).toBe(secondLogout);

    expect(navigate).toHaveBeenCalledTimes(1);

    completeNavigation(true);

    await expect(firstLogout).resolves.toBe(true);
    await expect(secondLogout).resolves.toBe(true);
  });

  it.each(['login', 'register'] as const)(
    'does not restore a session from a late %s response after logout',
    async endpoint => {
      const router = TestBed.inject(Router);

      vi.spyOn(router, 'navigate')
        .mockResolvedValue(true);

      const credentials = {
        email: 'verification@example.com',
        password: 'TestPassword!2026'
      };

      const operation = endpoint === 'login'
        ? service.login(credentials)
        : service.register({
          ...credentials,
          fullName: 'Verification User'
        });

      const result = firstValueFrom(operation);

      const assertion = expect(result).rejects.toThrow(
        'Authentication operation is no longer active.'
      );

      const request = httpTesting.expectOne(
        `${authUrl}/${endpoint}`
      );

      await service.logout();

      const response: AuthResponse = {
        accessToken: 'late-response-token',
        expiresAtUtc: new Date(
          Date.now() + 60_000
        ).toISOString(),
        email: credentials.email,
        fullName: 'Verification User',
        role: 'Customer'
      };

      request.flush(response);

      await assertion;

      expect(service.session()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getToken()).toBeNull();

      expect(sessionStorage.getItem(storageKey))
        .toBeNull();
    }
  );

  it('preserves the latest authentication session', async () => {
    const firstResult = firstValueFrom(
      service.login({
        email: 'agent@helpdesk.local',
        password: 'test-password'
      })
    );

    const firstAssertion = expect(firstResult).rejects.toThrow(
      'Authentication operation is no longer active.'
    );

    const firstRequest = httpTesting.expectOne(
      `${authUrl}/login`
    );

    const secondResult = firstValueFrom(
      service.login({
        email: 'manager@helpdesk.local',
        password: 'test-password'
      })
    );

    const secondRequest = httpTesting.expectOne(
      `${authUrl}/login`
    );

    const response: AuthResponse = {
      accessToken: 'manager-test-token',
      expiresAtUtc: new Date(
        Date.now() + 60_000
      ).toISOString(),
      email: 'manager@helpdesk.local',
      fullName: 'Demo Manager',
      role: 'Manager'
    };

    secondRequest.flush(response);

    await secondResult;

    firstRequest.flush({
      ...response,
      accessToken: 'agent-test-token',
      email: 'agent@helpdesk.local',
      fullName: 'Demo Agent',
      role: 'Agent'
    });

    await firstAssertion;

    expect(service.session()?.email)
      .toBe('manager@helpdesk.local');

    expect(service.userRole()).toBe('Manager');

    expect(service.getToken())
      .toBe('manager-test-token');
  });
});
