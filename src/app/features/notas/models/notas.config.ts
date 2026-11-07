import { EntityConfig } from '../../../core/models/crud.model';

export const NOTAS_CONFIG: EntityConfig = {
  title: 'Notas',
  description: 'Calificaciones por estudiante, materia y periodo (de 0.0 a 10.0).',
  module: '/academic/grades',
  endpoint: '/grades',
  columns: [
    { key: 'studentName', label: 'Estudiante' },
    { key: 'courseName', label: 'Curso' },
    { key: 'subjectName', label: 'Materia' },
    { key: 'period', label: 'Periodo', kind: 'enum', enumKey: 'period' },
    { key: 'value', label: 'Nota' }
  ],
  fields: [
    { name: 'studentId', label: 'Estudiante', type: 'ref', ref: 'students' },
    { name: 'courseSubjectId', label: 'Curso y materia', type: 'ref', ref: 'courseSubjects' },
    { name: 'period', label: 'Periodo', type: 'select', enumKey: 'period' },
    { name: 'value', label: 'Nota (0.0 - 10.0)', type: 'number' }
  ],
  update: ['value'],
  filter: {
    label: 'Buscar por estudiante',
    ref: 'students',
    allLabel: 'Todos los estudiantes',
    path: id => `/grades/student/${id}`
  }
};
