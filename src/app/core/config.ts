import { environment } from '../../environments/environment';

// ┌──────────────────────────────────────────────────────────────────────────────┐
// │ Las URLs salen de src/environments:                                          │
// │   environment.development.ts → ng serve (local)                              │
// │   environment.ts             → ng build (nube)                               │
// └──────────────────────────────────────────────────────────────────────────────┘
export const MAIN_API = {
  baseUrl: environment.mainApiUrl,
  timeoutMs: 60000
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
  model: 'llama3.2',
  enabled: false,      // true = el chat usa tu IA local desde que abre la app
  timeoutMs: 90000
};

// API auxiliar (apoyos visuales, pictogramas ARASAAC y auditoría).
export const AUX_API = {
  baseUrl: environment.auxApiUrl,
  timeoutMs: 60000
};
