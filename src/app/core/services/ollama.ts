import { Injectable, inject } from '@angular/core';
import { OLLAMA_DEFAULTS } from '../config';
import { AiSettingsService } from './ai-settings';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
      const json = (await response.json()) as { models?: { name: string }[] };
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
          body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.2 } })
        },
        OLLAMA_DEFAULTS.timeoutMs
      );
    } catch {
      throw new Error('No se pudo conectar con la IA local (Ollama). Verifica que Docker esté encendido.');
    }

    if (!response.ok) {
      let detail = '';
      try {
        detail = ((await response.json()) as { error?: string }).error ?? '';
      } catch {
        detail = '';
      }
      throw new Error(`Ollama respondió con error ${response.status}${detail ? ': ' + detail : ''}`);
    }

    const json = (await response.json()) as { message?: { content?: string } };
    const text = json.message?.content?.trim();

    if (!text) {
      throw new Error('La IA local no devolvió texto.');
    }
    return text;
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
