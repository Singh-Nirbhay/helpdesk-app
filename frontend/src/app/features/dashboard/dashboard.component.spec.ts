import { HttpErrorResponse } from '@angular/common/http';

import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import { Subject } from 'rxjs';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';

import type {
  CurrentUser
} from '../../core/models/auth.models';

describe('DashboardComponent', () => {

  let fixture: ComponentFixture<DashboardComponent>;
  let response$: Subject<CurrentUser>;

  const authMock = {
    getMe: vi.fn<AuthService['getMe']>()
  };

  const user: CurrentUser = {
    id: 'test-user-id',
    email: 'agent@helpdesk.local',
    role: 'Agent'
  };

  beforeEach(() => {
    response$ = new Subject<CurrentUser>();

    authMock.getMe.mockReset();

    authMock.getMe.mockReturnValue(
      response$.asObservable()
    );

    TestBed.configureTestingModule({
      imports: [DashboardComponent],

      providers: [
        {
          provide: AuthService,
          useValue: authMock
        }
      ]
    });

    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
  });

  function getElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('requests account information on initialization', () => {
    expect(authMock.getMe).toHaveBeenCalledTimes(1);

    expect(
      getElement().querySelector('[role="status"]')
        ?.textContent
    ).toContain('Verifying your account information');
  });

  it('displays the identity returned by the backend', () => {
    response$.next(user);
    response$.complete();

    fixture.detectChanges();

    const content = getElement().textContent;

    expect(content).toContain(user.id);
    expect(content).toContain(user.email);
    expect(content).toContain(user.role);

    expect(
      getElement().querySelector('[role="status"]')
    ).toBeNull();
  });

  it('displays an error when the API is unavailable', () => {
    response$.error(
      new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error'
      })
    );

    fixture.detectChanges();

    expect(
      getElement().querySelector('[role="alert"]')
        ?.textContent
    ).toContain('Unable to connect to the server.');

    expect(
      getElement().querySelector('[role="status"]')
    ).toBeNull();
  });

  it('displays an authentication error on HTTP 401', () => {
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
    ).toContain('Your session is no longer valid.');
  });

});
