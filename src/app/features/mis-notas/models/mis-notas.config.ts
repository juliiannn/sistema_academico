import { SelfViewConfig } from '../../../core/models/crud.model';

export const MIS_NOTAS_CONFIG: SelfViewConfig = {
  title: 'Mis notas',
  description: 'Tus calificaciones por materia y periodo.',
  endpoint: '/grades/me',
  kind: 'table',
  columns: [
    { key: 'subjectName', label: 'Materia' },
    { key: 'courseName', label: 'Curso' },
    { key: 'period', label: 'Periodo', kind: 'enum', enumKey: 'period' },
    { key: 'value', label: 'Nota' }
  ]
};
