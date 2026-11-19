// A signed-in customer as the server describes them (never includes the password)
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

// What the server sends back after registering or signing in
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
