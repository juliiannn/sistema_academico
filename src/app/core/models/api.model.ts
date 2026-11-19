// Contratos generales de la API principal (FastAPI).

/** Respuesta estándar del backend: { success, message, data }. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Lo que devuelve ApiService a los componentes: solo los datos ya tipados. */
export interface ApiResult<T> {
  data: T;
}

/** Los decimales (notas, promedios, porcentajes) llegan como texto desde la API: "7.5". */
export type Decimal = string | number;

/** Campos de auditoría y borrado lógico que comparten casi todas las tablas. */
export interface Auditable {
  estado: boolean;
  creado?: string | null;
  actualizado?: string | null;
}

/** Toda entidad tiene un identificador numérico. */
export interface Entity {
  id: number;
}

/** Opción de una lista desplegable (select). */
export interface SelectOption {
  value: string;
  label: string;
}
