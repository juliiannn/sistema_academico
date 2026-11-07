import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MAIN_API } from '../config';
import { Session } from '../models/session.model';
import { httpJson } from '../utils/http';

// Única información que se guarda en el navegador: la sesión (token JWT, rol y correo), igual que el proyecto original.
const SESSION_KEYS = ['accessToken', 'tokenType', 'role', 'email', 'mustChangePassword'];

@Injectable({ providedIn: 'root' })
export class AuthService {

  private router = inject(Router);

  private readonly _session = signal<Session | null>(this.readStoredSession());

  readonly session = this._session.asReadonly();
  readonly logged = computed(() => this._session() !== null);
  readonly role = computed(() => this._session()?.role ?? '');
  readonly email = computed(() => this._session()?.email ?? '');

  token(): string | null {
    return this._session()?.accessToken ?? null;
  }

  /** POST /auth/login en tu backend. */
  async login(email: string, password: string): Promise<Session> {

    const result = await httpJson(
      MAIN_API.baseUrl + '/auth/login', 'POST', { email, password }, null, MAIN_API.timeoutMs
    );

    const data = result.data;

    if (!data || !data.accessToken) {
      throw new Error('El servidor no devolvió el token.');
    }

    localStorage.setItem('accessToken', String(data.accessToken));
    localStorage.setItem('tokenType', String(data.tokenType ?? 'Bearer'));
    localStorage.setItem('role', String(data.role ?? ''));
    localStorage.setItem('email', email);
    localStorage.setItem('mustChangePassword', String(data.mustChangePassword ?? false));

    const session = this.readStoredSession() as Session;
    this._session.set(session);

    return session;
  }

  /** PUT /auth/change-password */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {

    await httpJson(
      MAIN_API.baseUrl + '/auth/change-password', 'PUT', { currentPassword, newPassword },
      this.token(), MAIN_API.timeoutMs
    );

    localStorage.setItem('mustChangePassword', 'false');

    const current = this._session();

    if (current) {
      this._session.set({ ...current, mustChangePassword: false });
    }
  }

  /** Sesión vencida o inválida (la detecta ApiService): se limpia y se vuelve al login. */
  expire(): void {
    SESSION_KEYS.forEach(key => localStorage.removeItem(key));
    this._session.set(null);
    void this.router.navigate(['/login']);
  }

  logout(): void {
    this.expire();
  }

  private readStoredSession(): Session | null {

    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      return null;
    }

    return {
      accessToken,
      role: localStorage.getItem('role') ?? '',
      email: localStorage.getItem('email') ?? '',
      mustChangePassword: localStorage.getItem('mustChangePassword') === 'true'
    };
  }
}
