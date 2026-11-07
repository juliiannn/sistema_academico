import { SelfViewConfig } from '../../../core/models/crud.model';

export const MI_ASISTENCIA_CONFIG: SelfViewConfig = {
  title: 'Mi asistencia',
  description: 'Tu registro de asistencia por materia.',
  endpoint: '/attendances/me',
  kind: 'table',
  columns: [
    { key: 'subjectName', label: 'Materia' },
    { key: 'courseName', label: 'Curso' },
    { key: 'date', label: 'Fecha' },
    { key: 'status', label: 'Asistencia', kind: 'enum', enumKey: 'attendanceStatus' }
  ]
};
