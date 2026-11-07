import { EntityConfig } from '../../../core/models/crud.model';

export const CURSOS_CONFIG: EntityConfig = {
  title: 'Cursos',
  description: 'Grupos de estudiantes por grado, con su aula y su director de curso.',
  module: '/academic/courses',
  endpoint: '/courses',
  columns: [
    { key: 'name', label: 'Curso' },
    { key: 'grade', label: 'Grado' },
    { key: 'classroom', label: 'Aula' },
    { key: 'schoolYear', label: 'Año escolar' },
    { key: 'directorTeacherName', label: 'Director de curso' },
    { key: 'estado', label: 'Estado', kind: 'bool' }
  ],
  fields: [
    { name: 'name', label: 'Nombre del curso', type: 'text' },
    { name: 'grade', label: 'Grado', type: 'text' },
    { name: 'classroom', label: 'Aula', type: 'text' },
    { name: 'schoolYear', label: 'Año escolar', type: 'number' },
    { name: 'directorTeacherId', label: 'Director de curso', type: 'ref', ref: 'teachers' }
  ],
  update: ['name', 'grade', 'classroom', 'schoolYear', 'directorTeacherId'],
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    activateUrl: id => `/courses/${id}/activate`,
    deactivateUrl: id => `/courses/${id}/deactivate`
  }
};
