import { EntityConfig } from '../../../core/models/crud.model';

export const HORARIOS_CONFIG: EntityConfig = {
  title: 'Horarios',
  description: 'Horario semanal de clases de cada curso.',
  module: '/academic/schedules',
  endpoint: '/schedules',
  columns: [
    { key: 'courseName', label: 'Curso' },
    { key: 'subjectName', label: 'Materia' },
    { key: 'dayOfWeek', label: 'Día', kind: 'enum', enumKey: 'dayOfWeek' },
    { key: 'startTime', label: 'Hora de inicio' },
    { key: 'endTime', label: 'Hora de fin' }
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
    deactivateUrl: id => `/schedules/${id}/deactivate`
  },
  filter: {
    label: 'Buscar por curso',
    ref: 'courses',
    allLabel: 'Todos los cursos',
    path: id => `/schedules/course/${id}`
  }
};
