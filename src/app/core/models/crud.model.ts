import { Row } from './row.model';

// De dónde salen las opciones de un campo "referencia" (se muestran NOMBRES, se guarda el id)
export type RefKey = 'students' | 'teachers' | 'courses' | 'subjects' | 'courseSubjects' | 'piarStudents' | 'studentEmails' | 'myAssignments' | 'roles' | 'modules';

export interface Option {
  value: string;
  label: string;
}

// Columna de una tabla: solo información legible, nunca ids
export interface ColumnDef {
  key: string;
  label: string;
  kind?: 'text' | 'bool' | 'enum' | 'datetime';
  enumKey?: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'email' | 'date' | 'time' | 'number' | 'textarea' | 'select' | 'ref';
  enumKey?: string;   // para type 'select'
  ref?: RefKey;       // para type 'ref'
  optional?: boolean; // por defecto todos los campos son obligatorios
  defaultValue?: string; // valor inicial al crear
}

export interface ToggleDef {
  idField: string;
  statusField: string;
  activeValue: unknown;
  activateUrl?: (id: unknown) => string;
  deactivateUrl?: (id: unknown) => string;
  activateLabel?: string;
  deactivateLabel?: string;
}

export interface ResetDef {
  idField: string;
  url: (id: unknown) => string;
}

// Filtro por NOMBRE (antes era por id numérico)
export interface FilterDef {
  label: string;
  ref: RefKey;
  allLabel: string;
  path: (id: string) => string;
}

// Configuración completa de una pantalla de gestión.
// Los permisos (crear / editar / desactivar) NO están aquí: salen de la tabla role_modules para el módulo `module`.
export interface EntityConfig {
  title: string;
  description: string;
  module: string;          // ruta del módulo en la tabla modules (ej. /academic/grades)
  endpoint: string;        // POST (crear) y base de PUT /:id (editar)
  listEndpoint?: string;   // GET del listado, si es distinto de endpoint (ej. /submissions/me)
  updateUrl?: (row: Row) => string;   // PUT de edición, si no es endpoint/:id (ej. /submissions/:id/grade)
  transform?: (rows: Row[]) => Row[]; // ajusta las filas que llegan de la API antes de mostrarlas
  toBody?: (body: Row, mode: 'create' | 'edit', row: Row | null) => Row | Promise<Row>;  // arma el JSON que se envía
  columns: ColumnDef[];
  fields: FieldDef[];
  update?: string[];
  extraActions?: ExtraAction[];  // botones propios de la pantalla
  toggle?: ToggleDef;
  resetPassword?: ResetDef;
  filter?: FilterDef;
  filters?: ClientFilterDef[];   // filtros encadenados sobre los datos cargados (ej. curso → materia)
}

// Filtro sobre una columna de la tabla: las opciones salen de los propios datos (ej. courseName, subjectName)
export interface ClientFilterDef {
  field: string;
  label: string;
  allLabel?: string;
  enumKey?: string;   // si el valor es un código (ej. period), se muestra su etiqueta
}

// Configuración de una pantalla personal (Mi perfil, Mis notas, ...)
export interface SelfViewConfig {
  title: string;
  description: string;
  endpoint: string;
  kind: 'table' | 'detail';
  columns?: ColumnDef[];                       // kind = 'table'
  details?: DetailField[];   // kind = 'detail'
}

export type { Row };

/** Lo que avisa el administrador CRUD cuando crea, edita o activa/desactiva un registro. */
export interface CrudChange {
  action: 'create' | 'update' | 'toggle';
  label: string;
}

/** Botón propio de una pantalla CRUD (además de editar y activar/desactivar). */
export interface ExtraAction {
  key: string;
  label: string;
  variant: 'primary' | 'secondary' | 'danger' | 'warning';
}

/** Dato de una ficha de solo lectura (Mi perfil). */
export interface DetailField {
  key: string;
  label: string;
  enumKey?: string;
}
