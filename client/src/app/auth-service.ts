import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from './auth';
import { clearSession, getStoredUser, getToken, saveSession } from './token-storage';

// Knows who is signed in. Every component that needs to know (the header, checkout, the account page)
// reads from here, so they all update together when someone signs in or out.
@Service()
export class AuthService {
  private http = inject(HttpClient);

  readonly token = signal<string | null>(getToken());
  readonly user = signal<AuthUser | null>(getStoredUser());
  readonly isLoggedIn = computed(() => this.token() !== null && this.user() !== null);

  register(details: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', details).pipe(tap((result) => this.startSession(result)));
  }

  login(details: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', details).pipe(tap((result) => this.startSession(result)));
  }

  logout(): void {
    clearSession();
    this.token.set(null);
    this.user.set(null);
  }

  // On page load: ask the server whether the saved token is still good (tokens expire after 7 days)
  restoreSession(): void {
    if (!this.token()) return;

    this.http.get<AuthUser>('/api/auth/me').subscribe({
      next: (user) => this.user.set(user),
      error: (error) => {
        if (error.status === 401) this.logout();
      }
    });
  }

  private startSession(result: AuthResponse): void {
    saveSession(result.token, result.user);
    this.token.set(result.token);
    this.user.set(result.user);
  }
}
