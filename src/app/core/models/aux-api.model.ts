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
  items: { arasaac_id: number; palabra: string; imagen_url: string }[];
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
