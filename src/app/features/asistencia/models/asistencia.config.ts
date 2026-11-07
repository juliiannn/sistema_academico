import { EntityConfig } from '../../../core/models/crud.model';

export const ASISTENCIA_CONFIG: EntityConfig = {
  title: 'Asistencia',
  description: 'Registro diario de asistencia por estudiante y materia.',
  module: '/academic/attendance',
  endpoint: '/attendances',
  columns: [
    { key: 'studentName', label: 'Estudiante' },
    { key: 'courseName', label: 'Curso' },
    { key: 'subjectName', label: 'Materia' },
    { key: 'date', label: 'Fecha' },
    { key: 'status', label: 'Asistencia', kind: 'enum', enumKey: 'attendanceStatus' }
  ],
  fields: [
    { name: 'studentId', label: 'Estudiante', type: 'ref', ref: 'students' },
    { name: 'courseSubjectId', label: 'Curso y materia', type: 'ref', ref: 'courseSubjects' },
    { name: 'date', label: 'Fecha', type: 'date' },
    { name: 'status', label: 'Asistencia', type: 'select', enumKey: 'attendanceStatus' }
  ],
  filter: {
    label: 'Buscar por estudiante',
    ref: 'students',
    allLabel: 'Todos los estudiantes',
    path: id => `/attendances/student/${id}`
  }
};
