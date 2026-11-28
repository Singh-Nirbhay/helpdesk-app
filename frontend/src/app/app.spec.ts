import { computed, signal } from '@angular/core';

import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import { provideRouter } from '@angular/router';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { App } from './app';

import { AuthService } from './core/services/auth.service';

import type {
  AuthResponse
} from './core/models/auth.models';

describe('App', () => {

  let fixture: ComponentFixture<App>;

  const session = signal<AuthResponse | null>(null);

  const demoSession: AuthResponse = {
    accessToken: 'test-token',
    expiresAtUtc: '2099-01-01T00:00:00Z',
    email: 'agent@helpdesk.local',
    fullName: 'Demo Agent',
    role: 'Agent'
  };

  const authMock = {
    session: session.asReadonly(),

    isAuthenticated: computed(() =>
      session() !== null
    ),

    logout: vi.fn<AuthService['logout']>()
  };

  beforeEach(() => {
    session.set(null);

    authMock.logout.mockReset();

    authMock.logout.mockImplementation(async () => {
      session.set(null);
      return true;
    });

    TestBed.configureTestingModule({
      imports: [App],

      providers: [
        provideRouter([]),

        {
          provide: AuthService,
          useValue: authMock
        }
      ]
    });

    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  });

  function getElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('creates the application shell', () => {
    expect(fixture.componentInstance).toBeTruthy();

    expect(
      getElement().querySelector('.app-brand')
        ?.textContent
    ).toContain('HelpDesk Application');

    expect(
      getElement().querySelector('router-outlet')
    ).not.toBeNull();
  });

  it('does not display account controls for guests', () => {
    expect(
      getElement().querySelector('.account-details')
    ).toBeNull();

    expect(
      getElement().querySelector('.logout-button')
    ).toBeNull();

    expect(
      getElement().querySelector('.login-link')
    ).not.toBeNull();
  });

  it('displays the authenticated name and role', () => {
    session.set(demoSession);
    fixture.detectChanges();

    expect(
      getElement().querySelector('.account-name')
        ?.textContent
    ).toContain('Demo Agent');

    expect(
      getElement().querySelector('.account-role')
        ?.textContent
    ).toContain('Agent');

    expect(
      getElement().querySelector('.logout-button')
    ).not.toBeNull();
  });

  it('logs out and removes authenticated account controls',
    async () => {

      session.set(demoSession);
      fixture.detectChanges();

      const button = getElement()
        .querySelector<HTMLButtonElement>(
          '.logout-button'
        )!;

      button.click();

      expect(authMock.logout)
        .toHaveBeenCalledTimes(1);

      await vi.waitFor(() => {
        fixture.detectChanges();

        expect(
          getElement().querySelector('.logout-button')
        ).toBeNull();

        expect(
          getElement().querySelector('.account-name')
        ).toBeNull();
      });
    }
  );

  it('provides a sign-in link when logout navigation fails',
    async () => {

      session.set(demoSession);

      authMock.logout.mockImplementationOnce(async () => {
        session.set(null);
        throw new Error('Navigation failed');
      });

      fixture.detectChanges();

      getElement()
        .querySelector<HTMLButtonElement>(
          '.logout-button'
        )!
        .click();

      await vi.waitFor(() => {
        fixture.detectChanges();

        const alert = getElement()
          .querySelector('[role="alert"]');

        expect(alert).not.toBeNull();

        expect(alert?.textContent)
          .toContain('Signed out.');

        expect(alert?.querySelector('a'))
          .not.toBeNull();
      });
    }
  );

});
