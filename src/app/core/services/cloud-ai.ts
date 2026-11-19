import { Injectable, inject } from '@angular/core';
import { ApiService } from './api';
import { ChatTurn } from './ollama';
import { errorMessage } from '../utils/format';

/** GET /assistant/status */
export interface CloudAiStatus {
  configured: boolean;
  provider: string;
  model: string | null;
}

/** POST /assistant/chat → cuerpo */
export interface CloudAiChatRequest {
  messages: ChatTurn[];
}

/** POST /assistant/chat → respuesta */
export interface CloudAiChatResponse {
  content: string;
  model: string;
  provider: string;
  totalTokens: number | null;
}

/** Resultado de "Probar conexión". */
export interface CloudAiCheck {
  ok: boolean;
  message: string;
  model: string | null;
}

// IA en la nube (Groq). El navegador NO llama a Groq: llama a la API principal, que guarda la clave
// (GROQ_API_KEY) y reenvía la conversación. Los nombres de estudiantes y docentes ya van cambiados por códigos.
@Injectable({ providedIn: 'root' })
export class CloudAiService {

  private api = inject(ApiService);

  async check(): Promise<CloudAiCheck> {
    try {
      const s = (await this.api.get<CloudAiStatus>('/assistant/status')).data;
      return s.configured
        ? { ok: true, model: s.model, message: `Conectado a la IA en la nube (Groq) · modelo ${s.model}.` }
        : { ok: false, model: null, message: 'La API principal no tiene configurada la IA en la nube: falta GROQ_API_KEY en su .env (o en Render).' };
    } catch (e) {
      return { ok: false, model: null, message: errorMessage(e) };
    }
  }

  async chat(messages: ChatTurn[]): Promise<CloudAiChatResponse> {
    const body: CloudAiChatRequest = { messages };
    return (await this.api.post<CloudAiChatResponse>('/assistant/chat', body)).data;
  }
}
