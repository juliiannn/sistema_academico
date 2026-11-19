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
  timeoutMs: 300000   // 5 min: en PC sin tarjeta gráfica, leer el resumen del colegio la primera vez puede tardar
};

// API auxiliar (apoyos visuales, pictogramas ARASAAC y auditoría).
export const AUX_API = {
  baseUrl: environment.auxApiUrl,
  timeoutMs: 15000
};

// Escala de notas del colegio (SIEE, Decreto 1290 de 2009), de 0 a 10. Debe coincidir con PASSING_GRADE de la API.
export const GRADE_SCALE = {
  max: 10,
  passing: 6.5,   // nota mínima para aprobar: menos de esto es desempeño Bajo
  high: 8,        // desde aquí, Alto
  superior: 9.5   // desde aquí, Superior
};

/** 6.5 → "6,5" (como se escribe en Colombia). */
export const PASSING_LABEL = GRADE_SCALE.passing.toFixed(1).replace('.', ',');

