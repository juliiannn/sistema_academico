import { Injectable, inject } from '@angular/core';
import { OLLAMA_DEFAULTS } from '../config';
import { AiSettingsService } from './ai-settings';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Opciones del modelo en POST /api/chat. */
export interface OllamaOptions {
  temperature: number;
  num_ctx: number;
}

/** POST /api/chat → cuerpo */
export interface OllamaChatRequest {
  model: string;
  messages: ChatTurn[];
  stream: false;
  options: OllamaOptions;
  think?: boolean;
}

/** Mensaje que devuelve el modelo. */
export interface OllamaMessage {
  role: string;
  content?: string;
}

/** POST /api/chat → respuesta */
export interface OllamaChatResponse {
  message?: OllamaMessage;
}

/** Un modelo instalado en Ollama. */
export interface OllamaModel {
  name: string;
}

/** GET /api/tags → modelos instalados */
export interface OllamaTagsResponse {
  models?: OllamaModel[];
}

/** Respuesta de error de Ollama. */
export interface OllamaErrorResponse {
  error?: string;
}

export interface OllamaStatus {
  ok: boolean;
  models: string[];
  message: string;
}

// ┌────────────────────────────────────────────────────────────────────────────┐
// │ AQUÍ SE CONECTA TU IA LOCAL. Habla con Ollama (Docker) por su API HTTP:    │
// │   GET  {baseUrl}/api/tags   → modelos instalados (probar conexión)         │
// │   POST {baseUrl}/api/chat   → respuesta del modelo (sin streaming)         │
// │ Si tu IA usa otro formato, solo hay que cambiar `chat()` de este archivo.  │
// └────────────────────────────────────────────────────────────────────────────┘
@Injectable({ providedIn: 'root' })
export class OllamaService {

  private settings = inject(AiSettingsService);

  async check(baseUrl?: string): Promise<OllamaStatus> {
    const url = (baseUrl ?? this.settings.settings().baseUrl) + '/api/tags';
    try {
      const response = await this.fetchWithTimeout(url, { method: 'GET' }, 8000);
      if (!response.ok) {
        return { ok: false, models: [], message: `Ollama respondió con error ${response.status}.` };
      }
      const json = (await response.json()) as OllamaTagsResponse;
      const models = (json.models ?? []).map(m => m.name);
      return {
        ok: true,
        models,
        message: models.length ? `Conectado. Modelos: ${models.join(', ')}` : 'Conectado, pero no hay modelos descargados (ollama pull <modelo>).'
      };
    } catch {
      return {
        ok: false,
        models: [],
        message: 'No se pudo conectar. Revisa que el contenedor esté encendido, el puerto 11434 publicado y OLLAMA_ORIGINS permita este sitio.'
      };
    }
  }

  async chat(messages: ChatTurn[]): Promise<string> {
    const { baseUrl, model } = this.settings.settings();

    let response: Response;
    try {
      response = await this.fetchWithTimeout(
        baseUrl + '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Modelos que "razonan" (qwen3, deepseek-r1): sin modo de pensamiento para responder más rápido en el chat
          body: JSON.stringify(this.chatRequest(model, messages))
        },
        OLLAMA_DEFAULTS.timeoutMs
      );
    } catch {
      throw new Error('No se pudo conectar con la IA local (Ollama). Verifica que Docker esté encendido.');
    }

    if (!response.ok) {
      let detail = '';
      try {
        detail = ((await response.json()) as OllamaErrorResponse).error ?? '';
      } catch {
        detail = '';
      }
      throw new Error(`Ollama respondió con error ${response.status}${detail ? ': ' + detail : ''}`);
    }

    const json = (await response.json()) as OllamaChatResponse;
    // Por si el modelo devuelve su razonamiento entre <think>...</think>, se muestra solo la respuesta final
    const text = json.message?.content?.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (!text) {
      throw new Error('La IA local no devolvió texto.');
    }
    return text;
  }

  /** Cuerpo de POST /api/chat. */
  private chatRequest(model: string, messages: ChatTurn[]): OllamaChatRequest {
    const request: OllamaChatRequest = {
      model, messages, stream: false,
      // num_ctx: ventana de contexto suficiente para el resumen de todo el colegio (por defecto Ollama usa 2048-4096)
      options: { temperature: 0.6, num_ctx: 12288 }
    };
    // Modelos que "razonan" (qwen3, deepseek-r1): sin modo de pensamiento para responder más rápido en el chat
    if (/qwen3|deepseek-r1/i.test(model)) {
      request.think = false;
    }
    return request;
  }

  private async fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
