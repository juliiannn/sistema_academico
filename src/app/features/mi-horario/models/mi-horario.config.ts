import { ColumnDef, SelfViewConfig } from '../../../core/models/crud.model';

const COLUMNS: ColumnDef[] = [
  { key: 'dayOfWeek', label: 'Día', kind: 'enum', enumKey: 'dayOfWeek' },
  { key: 'startTime', label: 'Hora de inicio' },
  { key: 'endTime', label: 'Hora de fin' },
  { key: 'subjectName', label: 'Materia' },
  { key: 'courseName', label: 'Curso' }
];

export const HORARIO_ESTUDIANTE_CONFIG: SelfViewConfig = {
  title: 'Mi horario',
  description: 'Las clases de tu curso durante la semana.',
  endpoint: '/schedules/me',
  kind: 'table',
  columns: COLUMNS
};

export const HORARIO_DOCENTE_CONFIG: SelfViewConfig = {
  title: 'Mi horario',
  description: 'Las clases que dictas durante la semana.',
  endpoint: '/schedules/teacher/me',
  kind: 'table',
  columns: COLUMNS
};
