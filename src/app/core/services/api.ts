import { Injectable, inject } from '@angular/core';
import { MAIN_API } from '../config';
import { ApiResponse, ApiResult } from '../models/api.model';
import { HttpError, httpJson } from '../utils/http';
import { AuthService } from './auth';
import { ReferenceService } from './references';

// Cliente del backend principal (equivale a assets/js/api.js del proyecto original).
// Todas las llamadas son asíncronas y devuelven { data }, igual que antes, con los nombres ya agregados.
@Injectable({ providedIn: 'root' })
export class ApiService {

  private auth = inject(AuthService);
  private refs = inject(ReferenceService);

  // Cada llamada indica el tipo que espera, por ejemplo: api.get<Grade[]>('/grades')
  async get<T>(endpoint: string): Promise<ApiResult<T>> {
    const res = await this.call<T>('GET', endpoint);
    return { data: (await this.refs.enrich(res.data)) as T };
  }

  async post<T = unknown>(endpoint: string, body: unknown): Promise<ApiResult<T>> {
    const res = await this.call<T>('POST', endpoint, body);
    this.refs.invalidate();
    return { data: res.data };
  }

  async put<T = unknown>(endpoint: string, body: unknown = {}): Promise<ApiResult<T>> {
    const res = await this.call<T>('PUT', endpoint, body);
    this.refs.invalidate();
    return { data: res.data };
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResult<T>> {
    const res = await this.call<T>('DELETE', endpoint);
    this.refs.invalidate();
    return { data: res.data };
  }

  /** Descarga un PDF (por ejemplo el boletín: /report-cards/me). */
  async pdf(endpoint: string, fileName: string): Promise<void> {
    await this.download(endpoint, fileName, 'application/pdf');
  }

  /**
   * Descarga un archivo protegido (PDF, Excel...) enviando el token. El nombre lo da el servidor
   * (cabecera Content-Disposition); si no viene, se usa fileName.
   */
  async download(endpoint: string, fileName: string, accept = '*/*'): Promise<void> {

    const token = this.auth.token();

    if (!token) {
      throw new Error('No estás autenticado.');
    }

    let response: Response;
    try {
      response = await fetch(MAIN_API.baseUrl + endpoint, {
        headers: { Accept: accept, Authorization: `Bearer ${token}` }
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
    }

    if (!response.ok) {
      let message = `Error HTTP ${response.status}`;
      try {
        const data = (await response.json()) as Partial<ApiResponse<unknown>>;
        message = data.message ?? message;
      } catch {
        // la respuesta no era JSON
      }
      throw new Error(message);
    }

    const disposition = response.headers.get('Content-Disposition') ?? '';
    const serverName = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = serverName ? decodeURIComponent(serverName) : fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private async call<T>(method: string, endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const res = await httpJson<T>(MAIN_API.baseUrl + endpoint, method, body, this.auth.token(), MAIN_API.timeoutMs);
      return { success: res.success ?? true, message: res.message ?? '', data: res.data as T };
    } catch (error) {
      if (error instanceof HttpError && error.status === 401 && this.auth.logged()) {
        this.auth.expire();
      }
      throw error;
    }
  }
}
