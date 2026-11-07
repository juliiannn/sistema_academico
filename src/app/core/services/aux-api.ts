import { Injectable, inject, signal } from '@angular/core';
import { AUX_API } from '../config';
import { AuthService } from './auth';
import {
  ApiEnvelope, AuditLog, PictogramSearch, Support, SupportInput, SupportPage
} from '../models/aux-api.model';

export class AuxApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// La API responde en inglés: se traducen los mensajes más comunes para mostrarlos en español
const MESSAGES: [RegExp, string][] = [
  [/must be one of/i, 'Valor no permitido en uno de los campos.'],
  [/titulo must be between/i, 'El título debe tener entre 3 y 150 caracteres.'],
  [/descripcion must be between/i, 'La descripción no puede superar 500 caracteres.'],
  [/pasos must be a non-empty array/i, 'Agrega al menos un paso.'],
  [/pasos can have at most/i, 'Un apoyo puede tener máximo 30 pasos.'],
  [/\.texto/i, 'Cada paso necesita un texto de máximo 200 caracteres.'],
  [/duracion_minutos/i, 'La duración de cada paso debe estar entre 1 y 240 minutos.'],
  [/not found/i, 'No se encontró el registro.'],
  [/only modify supports you created/i, 'Solo puedes modificar los apoyos que tú creaste.'],
  [/Token/i, 'Sesión no válida para la API auxiliar.']
];

export function translateApiMessage(message: string): string {
  return MESSAGES.find(([re]) => re.test(message))?.[1] ?? message;
}

// Cliente de la API auxiliar. Envía el MISMO token JWT que emite la API principal (Authorization: Bearer):
// la API auxiliar lo valida con el mismo JWT_SECRET (AUTH_ENABLED=true). Las cabeceras x-user-* solo se usan en modo libre.
@Injectable({ providedIn: 'root' })
export class AuxApiService {

  private auth = inject(AuthService);

  /** true = la API respondió a /health; false = no disponible; null = aún sin comprobar */
  readonly online = signal<boolean | null>(null);

  async check(): Promise<boolean> {
    try {
      await this.call<unknown>('GET', '/health');
      this.online.set(true);
    } catch {
      this.online.set(false);
    }
    return this.online() === true;
  }

  searchPictograms(q: string): Promise<PictogramSearch> {
    return this.call('GET', `/pictograms/search?q=${encodeURIComponent(q)}`);
  }

  listSupports(params: { estudiante_email?: string; tipo?: string; general?: boolean; page?: number; limit?: number } = {}): Promise<SupportPage> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== false) {
        qs.set(k, String(v));
      }
    });
    const text = qs.toString();
    return this.call('GET', '/supports' + (text ? `?${text}` : ''));
  }

  /** Recorre todas las páginas (la API limita a 100 por página). */
  async listAllSupports(params: { estudiante_email?: string; tipo?: string } = {}): Promise<Support[]> {
    const all: Support[] = [];
    for (let page = 1; page <= 50; page++) {
      const res = await this.listSupports({ ...params, page, limit: 100 });
      all.push(...res.items);
      if (all.length >= res.total || res.items.length === 0) {
        break;
      }
    }
    return all;
  }

  mySupports(): Promise<Support[]> {
    return this.call('GET', '/supports/me');
  }

  getSupport(id: number): Promise<Support> {
    return this.call('GET', `/supports/${id}`);
  }

  createSupport(input: SupportInput): Promise<Support> {
    return this.call('POST', '/supports', input);
  }

  updateSupport(id: number, input: SupportInput): Promise<Support> {
    return this.call('PUT', `/supports/${id}`, input);
  }

  deactivateSupport(id: number): Promise<null> {
    return this.call('PUT', `/supports/${id}/deactivate`, {});
  }

  async listAuditLogs(params: { modulo?: string; accion?: string; usuario_email?: string; limit?: number } = {}): Promise<AuditLog[]> {
    const qs = new URLSearchParams({ limit: String(params.limit ?? 100) });
    Object.entries(params).forEach(([k, v]) => {
      if (k !== 'limit' && v) {
        qs.set(k, String(v));
      }
    });
    const res = await this.call<{ items: AuditLog[] }>('GET', `/audit-logs?${qs.toString()}`);
    return res.items ?? [];
  }

  /** Registra una acción en la auditoría. Nunca lanza error: la auditoría no debe romper la pantalla. */
  async logAudit(accion: string, modulo: string, detalle: string): Promise<void> {
    try {
      await this.call('POST', '/audit-logs', { accion, modulo, detalle });
    } catch {
      // sin API auxiliar no hay auditoría remota; se ignora
    }
  }

  // ---------- HTTP ----------

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AUX_API.timeoutMs);

    try {
      const response = await fetch(AUX_API.baseUrl + path, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.auth.token() ? { Authorization: `Bearer ${this.auth.token()}` } : {}),
          'x-user-email': this.auth.email(),
          'x-user-role': this.auth.role()
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });

      let json: ApiEnvelope<T> | null = null;
      try {
        json = (await response.json()) as ApiEnvelope<T>;
      } catch {
        json = null;
      }

      if (!response.ok || (json && json.success === false)) {
        throw new AuxApiError(translateApiMessage(json?.message ?? `Error ${response.status}`), response.status);
      }

      return (json?.data ?? null) as T;

    } catch (error) {
      if (error instanceof AuxApiError) {
        throw error;
      }
      this.online.set(false);
      throw new AuxApiError(
        `No se pudo conectar con la API auxiliar (${AUX_API.baseUrl}). Verifica que esté encendida.`,
        0
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
