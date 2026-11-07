// Petición HTTP JSON con el formato de respuesta de tu backend: { success, message, data }.
// Es la misma lógica de errores que tenía assets/js/api.js del proyecto original.

export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface Envelope {
  success?: boolean;
  message?: string;
  data?: any;
}

export async function httpJson(
  url: string,
  method: string,
  body: unknown,
  token: string | null,
  timeoutMs: number
): Promise<Envelope> {

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

  let json: Envelope = {};
  try {
    json = (await response.json()) as Envelope;
  } catch {
    json = {};   // la respuesta no trae JSON (por ejemplo 204)
  }

  if (!response.ok) {
    const backend = json.message ?? '';

    if (response.status === 401) {
      const lower = backend.toLowerCase();
      const sessionError = !backend || lower.includes('no autenticado') || lower.includes('token');
      throw new HttpError(sessionError ? 'No autenticado. Inicia sesión nuevamente.' : backend, 401);
    }
    if (response.status === 403) {
      throw new HttpError('No tienes permisos para realizar esta acción.', 403);
    }
    throw new HttpError(backend || `Error HTTP ${response.status}`, response.status);
  }

  return json;
}
