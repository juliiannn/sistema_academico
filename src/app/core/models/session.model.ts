import { RoleName } from './domain-types';

/** Sesión guardada en el navegador. */
export interface Session {
  accessToken: string;
  role: RoleName | '';
  email: string;
  mustChangePassword: boolean;
}

/** POST /auth/login → data */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  role: RoleName;
  mustChangePassword: boolean;
}

/** POST /auth/login → cuerpo */
export interface LoginRequest {
  email: string;
  password: string;
}

/** PUT /auth/change-password → cuerpo */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
