import { AuthUser } from './auth';

// The login token and the user's name are kept in the browser so a page reload doesn't sign the customer out.
// (Plain functions, so the HTTP interceptor can use them without needing AuthService.)

const TOKEN_KEY = 'courtsideToken';
const USER_KEY = 'courtsideUser';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const text = localStorage.getItem(USER_KEY);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // If the browser blocks storage, the customer stays signed in until the page is closed
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // nothing to clear
  }
}
