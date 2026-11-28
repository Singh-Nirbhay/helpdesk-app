import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import {
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  template: ''
})
class TestPage { }

describe('Authentication route guards', () => {
  const authenticated = signal(false);

  let token: string | null;
  let router: Router;
  let harness: RouterTestingHarness;

  const authMock = {
    isAuthenticated: authenticated,
    getToken: () => token
  };

  beforeEach(async () => {
    authenticated.set(false);
    token = null;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'login',
            component: TestPage,
            canActivate: [guestGuard]
          },
          {
            path: 'register',
            component: TestPage,
            canActivate: [guestGuard]
          },
          {
            path: 'dashboard',
            component: TestPage,
            canActivate: [authGuard]
          },
          {
            path: 'tickets/:id',
            component: TestPage,
            canActivate: [authGuard]
          }
        ]),
        {
          provide: AuthService,
          useValue: authMock
        }
      ]
    });

    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  function authenticateUser(): void {
    authenticated.set(true);
    token = 'test-access-token';
  }

  describe('authGuard', () => {
    it('allows authenticated users to access protected routes',
      async () => {
        authenticateUser();

        await harness.navigateByUrl('/dashboard');

        expect(router.url).toBe('/dashboard');
      }
    );

    it('redirects unauthenticated users to login and preserves returnUrl',
      async () => {
        const requestedUrl = '/tickets/42?tab=activity#history';

        await harness.navigateByUrl(requestedUrl);

        const expectedUrl = router.createUrlTree(
          ['/login'],
          {
            queryParams: {
              returnUrl: requestedUrl
            }
          }
        );

        expect(router.url).toBe(
          router.serializeUrl(expectedUrl)
        );

        expect(
          router.parseUrl(router.url)
            .queryParamMap.get('returnUrl')
        ).toBe(requestedUrl);
      }
    );

    it('rejects stale authentication state when the token has expired',
      async () => {
        authenticated.set(true);
        token = null;

        await harness.navigateByUrl('/dashboard');

        expect(router.url).toBe(
          '/login?returnUrl=%2Fdashboard'
        );
      }
    );
  });

  describe('guestGuard', () => {
    it.each(['/login', '/register'])(
      'allows unauthenticated users to access %s',
      async path => {
        await harness.navigateByUrl(path);

        expect(router.url).toBe(path);
      }
    );

    it.each(['/login', '/register'])(
      'redirects authenticated users from %s to dashboard',
      async path => {
        authenticateUser();

        await harness.navigateByUrl(path);

        expect(router.url).toBe('/dashboard');
      }
    );

    it('allows login when the previous token has expired',
      async () => {
        authenticated.set(true);
        token = null;

        await harness.navigateByUrl('/login');

        expect(router.url).toBe('/login');
      }
    );
  });
});
