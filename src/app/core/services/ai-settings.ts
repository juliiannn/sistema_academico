import { Injectable, computed, inject, signal } from '@angular/core';
import { OLLAMA_DEFAULTS } from '../config';
import { AuthService } from './auth';

/** cloud = IA en la nube (Groq, a través de la API principal); local = Ollama en este computador. */
export type AiProvider = 'cloud' | 'local';

export interface AiSettings {
  enabled: boolean;     // true = el chat genera respuestas con IA; false = usa el asistente básico por reglas
  provider: AiProvider;
  baseUrl: string;      // solo IA local
  model: string;        // solo IA local (en la nube el modelo lo define el servidor: GROQ_MODEL)
}

const STORAGE_KEY = 'ai-settings-v2';

const DEFAULTS: AiSettings = {
  enabled: OLLAMA_DEFAULTS.enabled,
  provider: 'cloud',
  baseUrl: OLLAMA_DEFAULTS.baseUrl,
  model: OLLAMA_DEFAULTS.model
};

// Configuración del asistente. SOLO el administrador puede cambiarla (se recuerda en su navegador).
// Los demás roles usan siempre la IA en la nube: así la institución decide a dónde viajan los datos
// y nadie puede apuntar el asistente a otro servidor.
@Injectable({ providedIn: 'root' })
export class AiSettingsService {

  private auth = inject(AuthService);
  private readonly _settings = signal<AiSettings>(load());

  /** ¿Puede este usuario configurar la IA? */
  readonly canConfigure = computed(() => this.auth.role() === 'ADMIN');

  /** Configuración que se aplica de verdad (la del administrador, o la fija para los demás roles). */
  readonly settings = computed<AiSettings>(() => (this.canConfigure() ? this._settings() : { ...DEFAULTS, enabled: true, provider: 'cloud' }));

  update(next: AiSettings): void {
    if (!this.canConfigure()) {
      return;
    }
    const clean: AiSettings = {
      enabled: next.enabled,
      provider: next.provider === 'local' ? 'local' : 'cloud',
      baseUrl: next.baseUrl.trim().replace(/\/+$/, '') || OLLAMA_DEFAULTS.baseUrl,
      model: next.model.trim() || OLLAMA_DEFAULTS.model
    };
    this._settings.set(clean);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      /* sin almacenamiento: queda solo para esta pestaña */
    }
  }
}

function load(): AiSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<AiSettings> | null;
    return saved ? { ...DEFAULTS, ...saved } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}
