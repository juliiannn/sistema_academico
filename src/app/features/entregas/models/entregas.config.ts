import { ColumnDef, EntityConfig } from '../../../core/models/crud.model';
import { Submission } from '../../../core/models/academic.model';
import { fromRows, toRows } from '../../../core/models/row.model';
import { API_ENDPOINTS } from '../../../core/config';

const COMMON: ColumnDef[] = [
  { key: 'assignmentTitle', label: 'Actividad' },
  { key: 'subjectName', label: 'Materia' },
  { key: 'courseName', label: 'Curso' }
];

const RESULT: ColumnDef[] = [
  { key: 'contenido', label: 'Entrega (texto)' },
  { key: 'estadoEntrega', label: 'Estado' },
  { key: 'nota', label: 'Nota' },
  { key: 'retroalimentacion', label: 'Retroalimentación' },
  { key: 'actualizado', label: 'Última modificación', kind: 'datetime' }
];

/** Entrega con su estado en texto, para mostrarlo en la tabla. */
export interface SubmissionWithState extends Submission {
  estadoEntrega: string;
}

// Estado legible de la entrega (calificada / pendiente / tarde)
export function withSubmissionState(submissions: Submission[]): SubmissionWithState[] {
  return submissions.map(s => ({
    ...s,
    estadoEntrega: s.calificada ? 'Calificada' : s.entregaTardia ? 'Entregada tarde · pendiente' : 'Pendiente de calificar'
  }));
}

// Estudiante: escribe su entrega (solo texto), la corrige o la desactiva mientras no esté calificada
export const ENTREGAS_ESTUDIANTE_CONFIG: EntityConfig = {
  title: 'Mis entregas',
  description: 'Entrega tus actividades escribiendo tu respuesta. Puedes corregirla o desactivarla hasta que el docente la califique.',
  module: '/student/submissions',
  endpoint: API_ENDPOINTS.submissions,
  listEndpoint: API_ENDPOINTS.mySubmissions,
  transform: rows => toRows(withSubmissionState(fromRows<Submission>(rows))),
  columns: [...COMMON, { key: 'dueDate', label: 'Fecha límite' }, ...RESULT, { key: 'calificadoPorNombre', label: 'Calificada por' }],
  fields: [
    { name: 'assignmentId', label: 'Actividad', type: 'ref', ref: 'myAssignments' },
    { name: 'contenido', label: 'Tu respuesta', type: 'textarea' }
  ],
  update: ['contenido'],
  filters: [{ field: 'subjectName', label: 'Materia', allLabel: 'Todas las materias' }, { field: 'estadoEntrega', label: 'Estado', allLabel: 'Todas' }],
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    deactivateUrl: id => `${API_ENDPOINTS.submissions}/${id}/deactivate`
  }
};

// Docente: lee las respuestas y las califica con nota (0 a 10) y retroalimentación → el estudiante lo ve en "Mis entregas"
export const ENTREGAS_DOCENTE_CONFIG: EntityConfig = {
  title: 'Entregas de estudiantes',
  description: 'Lee las respuestas escritas de tus estudiantes y califícalas con una nota (0 a 10) y retroalimentación.',
  module: '/academic/submissions',
  endpoint: API_ENDPOINTS.submissions,
  updateUrl: row => `${API_ENDPOINTS.submissions}/${row['id']}/grade`,
  transform: rows => toRows(withSubmissionState(fromRows<Submission>(rows))),
  columns: [{ key: 'studentName', label: 'Estudiante' }, ...COMMON, ...RESULT, { key: 'calificadoPorNombre', label: 'Calificada por' }],
  fields: [
    { name: 'nota', label: 'Nota (0 a 10)', type: 'number' },
    { name: 'retroalimentacion', label: 'Retroalimentación', type: 'textarea' }
  ],
  update: ['nota', 'retroalimentacion'],
  filters: [{ field: 'courseName', label: 'Curso', allLabel: 'Todos los cursos' }, { field: 'subjectName', label: 'Materia', allLabel: 'Todas las materias' }, { field: 'assignmentTitle', label: 'Actividad', allLabel: 'Todas las actividades' }, { field: 'estadoEntrega', label: 'Estado', allLabel: 'Todas' }]
};
