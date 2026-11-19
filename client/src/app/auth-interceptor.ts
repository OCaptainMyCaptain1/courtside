import { HttpInterceptorFn } from '@angular/common/http';
import { getToken } from './token-storage';

// Runs on every request the app makes. If someone is signed in, it adds their login token
// to requests for our own API, so each component doesn't have to remember to do it.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = getToken();

  if (token && request.url.startsWith('/api/')) {
    request = request.clone({ setHeaders: { Authorization: 'Bearer ' + token } });
  }

  return next(request);
};
