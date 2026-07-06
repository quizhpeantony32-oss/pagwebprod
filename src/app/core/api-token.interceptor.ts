import { HttpInterceptorFn } from '@angular/common/http';

import { apiConfig } from './api.config';

export const apiTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(apiConfig.baseUrl)) {
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