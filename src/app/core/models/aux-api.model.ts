// Formas de datos de la API auxiliar (api_auxiliar). Respuesta estándar: { success, message, data }.
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Pictogram {
  arasaac_id: number;
  palabra: string;
  imagen_url: string;
}

export interface SupportStep {
  orden: number;
  texto: string;
  duracion_minutos: number | null;
  pictograma: Pictogram | null;
}

export interface Support {
  id: number;
  codigo: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  estudiante_email: string | null;
  general: boolean;
  creado_por: string;
  estado: boolean;
  creado: string;
  actualizado: string;
  total_pasos?: number;
  pasos?: SupportStep[];
  atribucion?: string;
}

export interface SupportPage {
  items: Support[];
  page: number;
  limit: number;
  total: number;
}

// Cuerpo que se envía al crear / editar un apoyo
export interface SupportInput {
  tipo: string;
  titulo: string;
  descripcion: string | null;
  estudiante_email: string | null;
  pasos: {
    texto: string;
    arasaac_id: number | null;
    palabra: string | null;
    duracion_minutos: number | null;
  }[];
}

export interface PictogramSearch {
  items: Pictogram[];
  total: number;
  atribucion: string;
}

export interface AuditLog {
  id: number;
  usuario_email: string;
  rol: string;
  accion: string;
  modulo: string;
  recurso_id: number | null;
  detalle: string | null;
  ip: string | null;
  creado: string;
}

/** Filtros de GET /supports. */
export interface SupportFilters {
  estudiante_email?: string;
  tipo?: string;
}

/** Filtros + paginación de GET /supports. */
export interface SupportQuery extends SupportFilters {
  general?: boolean;
  page?: number;
  limit?: number;
}

/** Filtros de GET /audit-logs. */
export interface AuditLogFilters {
  modulo?: string;
  accion?: string;
  usuario_email?: string;
  limit?: number;
}

/** GET /audit-logs → data */
export interface AuditLogPage {
  items: AuditLog[];
}

/** POST /audit-logs: lo que se registra en la auditoría. */
export interface AuditLogRequest {
  accion: string;
  modulo: string;
  detalle: string;
}

/** Evento "mover paso" del formulario de apoyo visual. */
export interface StepMove {
  index: number;
  direction: -1 | 1;
}
