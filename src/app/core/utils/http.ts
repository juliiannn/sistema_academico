import { translateMainApiMessage } from './api-messages';
// Petición HTTP JSON con el formato de respuesta de tu backend: { success, message, data }.
// Es la misma lógica de errores que tenía assets/js/api.js del proyecto original.

export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Respuesta cruda del backend (puede venir incompleta si hubo un error). */
export interface Envelope<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
}

export async function httpJson<T = unknown>(
  url: string,
  method: string,
  body: unknown,
  token: string | null,
  timeoutMs: number
): Promise<Envelope<T>> {

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
  } catch {
    throw new HttpError('No se pudo conectar con el servidor. Verifica que el backend esté encendido.', 0);
  } finally {
    clearTimeout(timer);
  }

  let json: Envelope<T> = {};
  try {
    json = (await response.json()) as Envelope<T>;
  } catch {
    json = {};   // la respuesta no trae JSON (por ejemplo 204)
  }

  if (!response.ok) {
    const backend = json.message ?? '';

    if (response.status === 401) {
      const lower = backend.toLowerCase();
      const sessionError = !backend || lower.includes('no autenticado') || lower.includes('token');
      throw new HttpError(sessionError ? 'No autenticado. Inicia sesión nuevamente.' : translateMainApiMessage(backend), 401);
    }
    if (response.status === 403) {
      // Si la API explica el motivo (p. ej. "solo materias que dictas"), se muestra traducido
      const generic = !backend || /permisos suficientes|not enough permissions|forbidden/i.test(backend);
      throw new HttpError(generic ? 'No tienes permisos para realizar esta acción.' : translateMainApiMessage(backend), 403);
    }
    throw new HttpError(backend ? translateMainApiMessage(backend) : `Error HTTP ${response.status}`, response.status);
  }

  return json;
}
