import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router
} from '@angular/router';

import { Subject } from 'rxjs';

import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

import type {
  AuthResponse
} from '../../../core/models/auth.models';

describe('LoginComponent', () => {

  let fixture: ComponentFixture<LoginComponent>;
  let response$: Subject<AuthResponse>;

  const authMock = {
    login: vi.fn<AuthService['login']>()
  };

  const credentials = {
    email: 'agent@helpdesk.local',
    password: 'test-password'
  };

  const response: AuthResponse = {
    accessToken: 'test-token',
    expiresAtUtc: '2099-01-01T00:00:00Z',
    email: credentials.email,
    fullName: 'Demo Agent',
    role: 'Agent'
  };

  beforeEach(() => {
    response$ = new Subject<AuthResponse>();

    authMock.login.mockReset();

    authMock.login.mockReturnValue(
      response$.asObservable()
    );

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: authMock
        }
      ]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createPage(returnUrl: string | null = null): void {
    const route = TestBed.inject(ActivatedRoute);

    vi.spyOn(
      route.snapshot,
      'queryParamMap',
      'get'
    ).mockReturnValue(
      convertToParamMap(
        returnUrl ? { returnUrl } : {}
      )
    );

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  }

  function getElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function enterValue(id: string, value: string): void {
    const input = getElement()
      .querySelector<HTMLInputElement>(`#${id}`)!;

    input.value = value;

    input.dispatchEvent(
      new Event('input', { bubbles: true })
    );

    fixture.detectChanges();
  }

  function fillValidForm(): void {
    enterValue('login-email', credentials.email);
    enterValue('login-password', credentials.password);
  }

  function submitForm(): void {
    const form = getElement()
      .querySelector<HTMLFormElement>('form')!;

    form.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true
      })
    );

    fixture.detectChanges();
  }

  it('does not display validation errors initially', () => {
    createPage();

    expect(getElement().textContent)
      .not.toContain('Email is required.');

    expect(getElement().textContent)
      .not.toContain('Password is required.');
  });

  it('rejects an empty form and displays validation errors', () => {
    createPage();

    submitForm();

    expect(authMock.login).not.toHaveBeenCalled();

    expect(getElement().textContent)
      .toContain('Email is required.');

    expect(getElement().textContent)
      .toContain('Password is required.');
  });

  it('rejects an invalid email address', () => {
    createPage();

    enterValue('login-email', 'invalid-email');
    enterValue('login-password', credentials.password);

    submitForm();

    expect(authMock.login).not.toHaveBeenCalled();

    expect(getElement().textContent)
      .toContain('Enter a valid email address.');
  });

  it('prevents duplicate login submissions', () => {
    createPage();
    fillValidForm();

    submitForm();
    submitForm();

    expect(authMock.login)
      .toHaveBeenCalledTimes(1);

    expect(authMock.login)
      .toHaveBeenCalledWith(credentials);

    const button = getElement()
      .querySelector<HTMLButtonElement>(
        'button[type="submit"]'
      )!;

    expect(button.disabled).toBe(true);
  });

  it('displays a generic error for incorrect credentials', () => {
    createPage();
    fillValidForm();
    submitForm();

    response$.error(
      new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      })
    );

    fixture.detectChanges();

    expect(
      getElement().querySelector('[role="alert"]')
        ?.textContent
    ).toContain('Invalid email or password');

    const button = getElement()
      .querySelector<HTMLButtonElement>(
        'button[type="submit"]'
      )!;

    expect(button.disabled).toBe(false);
  });

  it.each([
    [null, '/dashboard'],
    ['/tickets/42?tab=activity', '/tickets/42?tab=activity'],
    ['https://example.com', '/dashboard'],
    ['//example.com', '/dashboard'],
    ['/%2Fexample.com', '/dashboard'],
    ['/login', '/dashboard'],
    ['/register', '/dashboard']
  ])(
    'handles returnUrl %s safely',
    async (returnUrl, expectedUrl) => {

      createPage(returnUrl);

      const router = TestBed.inject(Router);

      const navigate = vi.spyOn(router, 'navigateByUrl')
        .mockResolvedValue(true);

      fillValidForm();
      submitForm();

      response$.next(response);
      response$.complete();

      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        expectedUrl,
        { replaceUrl: true }
      );
    }
  );

});
