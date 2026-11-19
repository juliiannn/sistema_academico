// Módulo de reportes (GET/POST /reports/*) y notificaciones por correo (GET/POST/PUT /notifications/*).
import { Period } from './domain-types';

/** Tipos de reporte que ofrece la API. */
export type ReportType = 'consolidado' | 'notas' | 'asistencia' | 'estudiantes' | 'piar';

/** Formatos de descarga. */
export type ReportFormat = 'xlsx' | 'pdf';

/** Filtros que puede pedir cada tipo de reporte. */
export type ReportFilterKey = 'curso' | 'materia' | 'periodo' | 'desde' | 'hasta';

/** GET /reports/catalog: los reportes disponibles para el rol. */
export interface ReportCatalogItem {
  tipo: ReportType;
  titulo: string;
  descripcion: string;
  filtros: ReportFilterKey[];
}

/** Una opción de filtro (curso o materia). */
export interface ReportOption {
  id: number;
  nombre: string;
}

/** GET /reports/options: cursos y materias que el usuario puede elegir. */
export interface ReportOptions {
  cursos: ReportOption[];
  materias: ReportOption[];
}

/** Criterios de consulta que viajan en el cuerpo de la petición. */
export interface ReportFilters {
  cursoId?: number;
  materiaId?: number;
  periodo?: Period;
  desde?: string;
  hasta?: string;
}

/** POST /reports/generate */
export interface ReportRequest extends ReportFilters {
  tipo: ReportType;
  formato: ReportFormat;
}

/** POST /reports/email */
export interface ReportEmailRequest extends ReportFilters {
  tipo: ReportType;
  formatos: ReportFormat[];
}

/** Archivo generado (se guarda temporalmente en el servidor). */
export interface ReportFile {
  id: number;
  tipo: ReportType;
  titulo: string;
  formato: ReportFormat;
  filtros: string;
  nombreArchivo: string;
  tamanoBytes: number;
  filas: number;
  creado: string | null;
  expiraEn: string;
  enviadoA: string | null;
}

/** Estado de un correo. */
export type NotificationState = 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' | 'OMITIDO';

/** Eventos que generan correos. */
export type NotificationEventCode =
  | 'USER_REGISTERED' | 'PASSWORD_CHANGED' | 'REPORT_GENERATED' | 'LOW_GRADE' | 'ABSENCE'
  | 'ANNOUNCEMENT_PUBLISHED' | 'PIAR_CHANGED' | 'TEST';

/** POST /reports/email: resultado del envío. */
export interface ReportEmailResult {
  estado: NotificationState;
  destinatario: string;
  enviadoA: string | null;
  error: string | null;
  archivos: ReportFile[];
}

/** GET /notifications: un correo registrado. */
export interface EmailNotification {
  id: number;
  evento: NotificationEventCode;
  eventoNombre: string;
  destinatario: string;
  enviadoA: string | null;
  usuarioNombre: string | null;
  asunto: string;
  resumen: string;
  estado: NotificationState;
  intentos: number;
  error: string | null;
  tieneAdjuntos: boolean;
  creado: string | null;
  enviadoEn: string | null;
}

/** GET /notifications/stats */
export interface NotificationStats {
  total: number;
  enviados: number;
  fallidos: number;
  pendientes: number;
  omitidos: number;
  porEvento: Record<string, number>;
}

/** GET /notifications/settings: qué eventos envían correo. */
export interface NotificationSetting {
  evento: NotificationEventCode;
  nombre: string;
  descripcion: string;
  destinatarios: string;
  activo: boolean;
}

/** GET /notifications/config: configuración del servidor de correo (sin contraseña). */
export interface EmailConfig {
  configured: boolean;
  host: string | null;
  port: number | null;
  security: string;
  sender: string | null;
  redirectTo: string | null;
  allowedDomains: string[];   // vacío = se envía a cualquier dominio
}

/** PUT /notifications/settings/{evento} */
export interface NotificationSettingUpdate {
  activo: boolean;
}
