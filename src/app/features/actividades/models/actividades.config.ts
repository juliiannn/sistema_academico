import { EntityConfig } from '../../../core/models/crud.model';

export const ACTIVIDADES_CONFIG: EntityConfig = {
  title: 'Actividades',
  description: 'Tareas y trabajos publicados por los docentes.',
  module: '/academic/assignments',
  endpoint: '/assignments',
  columns: [
    { key: 'courseName', label: 'Curso' },
    { key: 'subjectName', label: 'Materia' },
    { key: 'title', label: 'Título' },
    { key: 'description', label: 'Descripción' },
    { key: 'dueDate', label: 'Fecha límite' }
  ],
  fields: [
    { name: 'courseSubjectId', label: 'Curso y materia', type: 'ref', ref: 'courseSubjects' },
    { name: 'title', label: 'Título', type: 'text' },
    { name: 'description', label: 'Descripción', type: 'textarea' },
    { name: 'dueDate', label: 'Fecha límite', type: 'date' }
  ],
  update: ['title', 'description', 'dueDate'],
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    deactivateUrl: id => `/assignments/${id}/deactivate`
  },
  extraActions: [{ key: 'submissions', label: 'Ver respuestas', variant: 'primary' }],
  filter: {
    label: 'Buscar por curso y materia',
    ref: 'courseSubjects',
    allLabel: 'Todos los cursos y materias',
    path: id => `/assignments/course-subject/${id}`
  }
};
