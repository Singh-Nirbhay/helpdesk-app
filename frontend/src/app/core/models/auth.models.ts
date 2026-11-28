export type AppRole =
  | 'Customer'
  | 'Agent'
  | 'Manager'
  | 'Admin';

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
}

export interface AuthResponse {
  readonly accessToken: string;
  readonly expiresAtUtc: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: AppRole;
}

export interface CurrentUser {
  readonly id: string;
  readonly email: string;
  readonly role: AppRole;
}
