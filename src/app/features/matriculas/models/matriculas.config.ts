import { EntityConfig } from '../../../core/models/crud.model';

export const MATRICULAS_CONFIG: EntityConfig = {
  title: 'Matrículas',
  description: 'Inscripción de los estudiantes en cada curso.',
  module: '/academic/enrollments',
  endpoint: '/enrollments',
  columns: [
    { key: 'studentName', label: 'Estudiante' },
    { key: 'courseName', label: 'Curso' },
    { key: 'status', label: 'Estado', kind: 'enum', enumKey: 'status' }
  ],
  fields: [
    { name: 'studentId', label: 'Estudiante', type: 'ref', ref: 'students' },
    { name: 'courseId', label: 'Curso', type: 'ref', ref: 'courses' }
  ],
  filters: [{ field: 'courseName', label: 'Curso', allLabel: 'Todos los cursos' }, { field: 'status', label: 'Estado', allLabel: 'Todos', enumKey: 'status' }],
  toggle: {
    idField: 'id',
    statusField: 'status',
    activeValue: 'ACTIVE',
    deactivateUrl: id => `/enrollments/${id}/cancel`,
    deactivateLabel: 'Cancelar matrícula',
    // Reactivar: solo si el estudiante no tiene otra matrícula vigente (lo valida la API)
    activateUrl: id => `/enrollments/${id}/reactivate`,
    activateLabel: 'Reactivar matrícula'
  }
};
