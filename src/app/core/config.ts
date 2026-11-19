import { environment } from '../../environments/environment';

// ┌──────────────────────────────────────────────────────────────────────────────┐
// │ Las URLs salen de src/environments:                                          │
// │   environment.development.ts → ng serve (local)                              │
// │   environment.ts             → ng build (nube)                               │
// └──────────────────────────────────────────────────────────────────────────────┘
export const MAIN_API = {
  baseUrl: environment.mainApiUrl,
  timeoutMs: 20000
};

// Rutas de la API principal que se usan en varias pantallas
export const API_ENDPOINTS = {
  piar: '/piars',                      // GET lista · POST · PUT /:id · PUT /:id/activate|deactivate · GET /me
  submissions: '/submissions',         // GET lista (directivos/docente) · POST · PUT /:id (estudiante) · PUT /:id/grade (docente)
  mySubmissions: '/submissions/me',    // entregas del estudiante autenticado
  permissions: '/auth/me/permissions'  // módulos del rol (tabla role_modules)
};

// IA local (Ollama en Docker). Estos son los valores por defecto; en el chat se pueden cambiar y se guardan en el navegador.
export const OLLAMA_DEFAULTS = {
  baseUrl: environment.ollamaUrl,
  model: 'qwen3:4b',   // modelo generativo recomendado (8-12 GB de RAM). PC de 8 GB: 'llama3.2:3b'
  enabled: true,       // el asistente GENERA sus respuestas con la IA local (si no responde, usa el modo básico)
  timeoutMs: 90000
};

// API auxiliar (apoyos visuales, pictogramas ARASAAC y auditoría).
export const AUX_API = {
  baseUrl: environment.auxApiUrl,
  timeoutMs: 15000
};
