import { EntityConfig } from '../../../core/models/crud.model';

export const HORARIOS_CONFIG: EntityConfig = {
  title: 'Horarios',
  description: 'Horario semanal de clases de cada curso.',
  module: '/academic/schedules',
  endpoint: '/schedules',
  listEndpoint: '/schedules?include_inactive=true',
  columns: [
    { key: 'courseName', label: 'Curso' },
    { key: 'subjectName', label: 'Materia' },
    { key: 'dayOfWeek', label: 'Día', kind: 'enum', enumKey: 'dayOfWeek' },
    { key: 'startTime', label: 'Hora de inicio' },
    { key: 'endTime', label: 'Hora de fin' },
    { key: 'estado', label: 'Estado', kind: 'bool' }
  ],
  fields: [
    { name: 'courseSubjectId', label: 'Curso y materia', type: 'ref', ref: 'courseSubjects' },
    { name: 'dayOfWeek', label: 'Día', type: 'select', enumKey: 'dayOfWeek' },
    { name: 'startTime', label: 'Hora de inicio', type: 'time' },
    { name: 'endTime', label: 'Hora de fin', type: 'time' }
  ],
  update: ['dayOfWeek', 'startTime', 'endTime'],
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    activateUrl: id => `/schedules/${id}/activate`,
    deactivateUrl: id => `/schedules/${id}/deactivate`
  },
  filters: [{ field: 'courseName', label: 'Curso', allLabel: 'Todos los cursos' }, { field: 'subjectName', label: 'Materia', allLabel: 'Todas las materias' }, { field: 'dayOfWeek', label: 'Día', allLabel: 'Todos los días', enumKey: 'dayOfWeek' }]
};
