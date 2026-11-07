import { Injectable, signal } from '@angular/core';
import { OLLAMA_DEFAULTS } from '../config';

export interface AiSettings {
  enabled: boolean;     // true = el chat usa tu IA local (Ollama); false = usa el asistente básico por reglas
  baseUrl: string;
  model: string;
}

// Configuración de la IA local. Vive solo en memoria mientras la pestaña esté abierta;
// para dejarla fija cambia OLLAMA_DEFAULTS (y `enabled`) en core/config.ts.
@Injectable({ providedIn: 'root' })
export class AiSettingsService {

  private readonly _settings = signal<AiSettings>({
    enabled: OLLAMA_DEFAULTS.enabled,
    baseUrl: OLLAMA_DEFAULTS.baseUrl,
    model: OLLAMA_DEFAULTS.model
  });

  readonly settings = this._settings.asReadonly();

  update(next: AiSettings): void {
    this._settings.set({
      enabled: next.enabled,
      baseUrl: next.baseUrl.trim().replace(/\/+$/, '') || OLLAMA_DEFAULTS.baseUrl,
      model: next.model.trim() || OLLAMA_DEFAULTS.model
    });
  }
}
