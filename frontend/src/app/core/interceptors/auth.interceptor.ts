import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import { inject } from '@angular/core';
import { isActive, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const API_URL = new URL(environment.apiUrl);
const API_PATH = API_URL.pathname.replace(/\/+$/, '');

function getApiPath(url: string): string | null {
  try {
    const requestUrl = new URL(url);

    const isApiRequest =
      requestUrl.origin === API_URL.origin &&
      (
        requestUrl.pathname === API_PATH ||
        requestUrl.pathname.startsWith(`${API_PATH}/`)
      );

    if (!isApiRequest) {
      return null;
    }

    return requestUrl.pathname
      .slice(API_PATH.length)
      .replace(/\/+$/, '')
      .toLowerCase();

  } catch {
    return null;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiPath = getApiPath(req.url);

  // Never attach authentication headers to unrelated requests.
  if (apiPath === null) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  const requestSession = authService.session();
  const token = authService.getToken();

  const isAuthEndpoint =
    apiPath === '/auth/login' ||
    apiPath === '/auth/register';

  const authReq = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint
      ) {
        const currentSession = authService.session();

        // An older request must not clear a newer session.
        const hasNewSession =
          currentSession !== null &&
          currentSession !== requestSession;

        const alreadyOnLogin =
          currentSession === null &&
          isActive('/login', router, {
            paths: 'exact',
            queryParams: 'ignored'
          })();

        if (!hasNewSession && !alreadyOnLogin) {
          void authService.logout().catch(() => {
            console.error(
              'Unable to navigate to login after session cleanup.'
            );
          });
        }
      }

      return throwError(() => error);
    })
  );
};
