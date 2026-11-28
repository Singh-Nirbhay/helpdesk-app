import { HttpErrorResponse } from '@angular/common/http';

import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import { provideRouter, Router } from '@angular/router';

import { Subject } from 'rxjs';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RegisterComponent } from './register.component';

import { AuthService } from '../../../core/services/auth.service';

import type {
  AuthResponse,
  RegisterRequest
} from '../../../core/models/auth.models';

describe('RegisterComponent', () => {

  let fixture: ComponentFixture<RegisterComponent>;
  let response$: Subject<AuthResponse>;

  const authMock = {
    register: vi.fn<AuthService['register']>()
  };

  const validPayload: RegisterRequest = {
    fullName: 'Test Customer',
    email: 'customer@example.com',
    password: 'StrongPass!2026'
  };

  const response: AuthResponse = {
    accessToken: 'test-access-token',
    expiresAtUtc: '2099-01-01T00:00:00Z',
    email: validPayload.email,
    fullName: validPayload.fullName,
    role: 'Customer'
  };

  beforeEach(() => {
    response$ = new Subject<AuthResponse>();

    authMock.register.mockReset();

    authMock.register.mockReturnValue(
      response$.asObservable()
    );

    TestBed.configureTestingModule({
      imports: [RegisterComponent],

      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: authMock
        }
      ]
    });

    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  function fillForm(
    payload: RegisterRequest = validPayload
  ): void {
    enterValue('register-full-name', payload.fullName);
    enterValue('register-email', payload.email);
    enterValue('register-password', payload.password);
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

  function submitButton(): HTMLButtonElement {
    return getElement()
      .querySelector<HTMLButtonElement>(
        'button[type="submit"]'
      )!;
  }

  it('does not display validation errors initially', () => {
    expect(getElement().textContent)
      .not.toContain('Full name is required.');

    expect(getElement().textContent)
      .not.toContain('Email is required.');

    expect(getElement().textContent)
      .not.toContain('Password is required.');
  });

  it('rejects an empty registration form', () => {
    submitForm();

    expect(authMock.register).not.toHaveBeenCalled();

    expect(getElement().textContent)
      .toContain('Full name is required.');

    expect(getElement().textContent)
      .toContain('Email is required.');

    expect(getElement().textContent)
      .toContain('Password is required.');
  });

  it('rejects a whitespace-only full name', () => {
    fillForm({
      ...validPayload,
      fullName: '     '
    });

    submitForm();

    expect(authMock.register).not.toHaveBeenCalled();

    expect(getElement().textContent)
      .toContain('Full name is required.');
  });

  it('rejects a full name shorter than two characters', () => {
    fillForm({
      ...validPayload,
      fullName: '  A  '
    });

    submitForm();

    expect(authMock.register).not.toHaveBeenCalled();

    expect(getElement().textContent)
      .toContain('Full name must contain at least 2 characters');
  });

  it('rejects an invalid email address', () => {
    fillForm({
      ...validPayload,
      email: 'invalid-email'
    });

    submitForm();

    expect(authMock.register).not.toHaveBeenCalled();

    expect(getElement().textContent)
      .toContain('Enter a valid email address.');
  });

  it('rejects passwords shorter than 12 characters', () => {
    fillForm({
      ...validPayload,
      password: 'Short!123'
    });

    submitForm();

    expect(authMock.register).not.toHaveBeenCalled();

    expect(getElement().textContent)
      .toContain('Password must contain at least 12 characters.');
  });

  it.each([
    ['uppercase', 'strongpass!2026'],
    ['lowercase', 'STRONGPASS!2026'],
    ['digit', 'StrongPassword!'],
    ['non-alphanumeric character', 'StrongPass2026']
  ])(
    'rejects passwords missing a %s',
    (_requirement, password) => {

      fillForm({
        ...validPayload,
        password
      });

      submitForm();

      expect(authMock.register).not.toHaveBeenCalled();

      expect(getElement().textContent)
        .toContain(
          'Password does not meet the complexity requirements.'
        );
    }
  );

  it('prevents duplicate registration requests', () => {
    fillForm();

    submitForm();
    submitForm();

    expect(authMock.register).toHaveBeenCalledTimes(1);

    expect(authMock.register)
      .toHaveBeenCalledWith(validPayload);

    expect(submitButton().disabled).toBe(true);
  });

  it('normalizes the name without changing the password', () => {
    const password = ' StrongPass!2026 ';

    fillForm({
      ...validPayload,
      fullName: '  Test Customer  ',
      password
    });

    submitForm();

    expect(authMock.register).toHaveBeenCalledWith({
      fullName: 'Test Customer',
      email: validPayload.email,
      password
    });
  });

  it('displays a generic error when registration fails', () => {
    fillForm();
    submitForm();

    response$.error(
      new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: {
          message: 'Registration failed'
        }
      })
    );

    fixture.detectChanges();

    expect(
      getElement().querySelector('[role="alert"]')
        ?.textContent
    ).toContain('Registration could not be completed.');

    expect(submitButton().disabled).toBe(false);
  });

  it('navigates to dashboard after successful registration',
    async () => {

      const router = TestBed.inject(Router);

      const navigate = vi.spyOn(router, 'navigateByUrl')
        .mockResolvedValue(true);

      fillForm();
      submitForm();

      response$.next(response);
      response$.complete();

      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        '/dashboard',
        { replaceUrl: true }
      );
    }
  );

  it('handles navigation failure after account creation',
    async () => {

      const router = TestBed.inject(Router);

      const navigate = vi.spyOn(router, 'navigateByUrl')
        .mockRejectedValue(new Error('Navigation failed'));

      fillForm();
      submitForm();

      response$.next(response);
      response$.complete();

      expect(navigate).toHaveBeenCalledWith(
        '/dashboard',
        { replaceUrl: true }
      );

      await vi.waitFor(() => {
        fixture.detectChanges();

        const alert = getElement()
          .querySelector('[role="alert"]');

        expect(alert).not.toBeNull();

        expect(alert?.textContent)
          .toContain('Account created successfully');

        expect(submitButton().disabled).toBe(false);
      }, {
        timeout: 1000,
        interval: 20
      });
    }
  );

  it('cancels the subscription when the component is destroyed',
    () => {

      const router = TestBed.inject(Router);

      const navigate = vi.spyOn(router, 'navigateByUrl')
        .mockResolvedValue(true);

      fillForm();
      submitForm();

      fixture.destroy();

      response$.next(response);
      response$.complete();

      expect(navigate).not.toHaveBeenCalled();
    }
  );

});
