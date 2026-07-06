import { HttpInterceptorFn } from '@angular/common/http';

import { apiConfig } from './api.config';

const protectedMethods = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export const apiTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(apiConfig.baseUrl) || !protectedMethods.has(request.method)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        [apiConfig.tokenHeader]: apiConfig.tokenValue
      }
    })
  );
};