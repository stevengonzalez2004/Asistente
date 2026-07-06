import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenRefreshService } from './token-refresh.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenRefresh = inject(TokenRefreshService);

  const token = authService.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const esRutaAuth = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

      if (!esRutaAuth && (error.status === 401 || error.status === 403)) {
        return tokenRefresh.refreshAccessToken().pipe(
          switchMap((nuevoToken) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${nuevoToken}` } })),
          ),
          catchError((errorRefresh) => {
            authService.logout();
            return throwError(() => errorRefresh);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
