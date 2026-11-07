import { Injectable, inject } from '@angular/core';
import { MAIN_API } from '../config';
import { HttpError, httpJson } from '../utils/http';
import { AuthService } from './auth';
import { ReferenceService } from './references';

// Cliente del backend principal (equivale a assets/js/api.js del proyecto original).
// Todas las llamadas son asíncronas y devuelven { data }, igual que antes, con los nombres ya agregados.
@Injectable({ providedIn: 'root' })
export class ApiService {

  private auth = inject(AuthService);
  private refs = inject(ReferenceService);

  async get(endpoint: string): Promise<{ data: any }> {
    const res = await this.call('GET', endpoint);
    return { data: await this.refs.enrich(res.data) };
  }

  async post(endpoint: string, body: unknown): Promise<{ data: any }> {
    const res = await this.call('POST', endpoint, body);
    this.refs.invalidate();
    return { data: res.data };
  }

  async put(endpoint: string, body: unknown = {}): Promise<{ data: any }> {
    const res = await this.call('PUT', endpoint, body);
    this.refs.invalidate();
    return { data: res.data };
  }

  async delete(endpoint: string): Promise<{ data: any }> {
    const res = await this.call('DELETE', endpoint);
    this.refs.invalidate();
    return { data: res.data };
  }

  /** Descarga un PDF (por ejemplo el boletín: /report-cards/me). */
  async pdf(endpoint: string, fileName: string): Promise<void> {

    const token = this.auth.token();

    if (!token) {
      throw new Error('No estás autenticado.');
    }

    let response: Response;
    try {
      response = await fetch(MAIN_API.baseUrl + endpoint, {
        headers: { Accept: 'application/pdf', Authorization: `Bearer ${token}` }
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
    }

    if (!response.ok) {
      let message = `Error HTTP ${response.status}`;
      try {
        const data = (await response.json()) as { message?: string };
        message = data.message ?? message;
      } catch {
        // la respuesta no era JSON
      }
      throw new Error(message);
    }

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private async call(method: string, endpoint: string, body?: unknown) {
    try {
      return await httpJson(MAIN_API.baseUrl + endpoint, method, body, this.auth.token(), MAIN_API.timeoutMs);
    } catch (error) {
      if (error instanceof HttpError && error.status === 401 && this.auth.logged()) {
        this.auth.expire();
      }
      throw error;
    }
  }
}
