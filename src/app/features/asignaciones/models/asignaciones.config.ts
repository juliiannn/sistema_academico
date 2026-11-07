import { EntityConfig } from '../../../core/models/crud.model';

export const ASIGNACIONES_CONFIG: EntityConfig = {
  title: 'Asignación de materias',
  description: 'Qué docente dicta qué materia en cada curso.',
  module: '/academic/course-subjects',
  endpoint: '/course-subjects',
  columns: [
    { key: 'courseName', label: 'Curso' },
    { key: 'subjectName', label: 'Materia' },
    { key: 'teacherName', label: 'Docente' },
    { key: 'estado', label: 'Estado', kind: 'bool' }
  ],
  fields: [
    { name: 'courseId', label: 'Curso', type: 'ref', ref: 'courses' },
    { name: 'subjectId', label: 'Materia', type: 'ref', ref: 'subjects' },
    { name: 'teacherId', label: 'Docente', type: 'ref', ref: 'teachers' }
  ],
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    deactivateUrl: id => `/course-subjects/${id}/deactivate`,
    deactivateLabel: 'Desactivar'
  }
};
