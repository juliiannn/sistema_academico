import { EntityConfig } from '../../../core/models/crud.model';
import { PERSON_COLUMNS, PERSON_FIELDS, STATE_COLUMN, USER_TOGGLE } from '../../../core/models/person.config';

export const ESTUDIANTES_CONFIG: EntityConfig = {
  title: 'Estudiantes',
  description: 'Consulta y administra los estudiantes de la institución.',
  module: '/people/students',
  endpoint: '/students',
  columns: [
    ...PERSON_COLUMNS,
    { key: 'guardianName', label: 'Acudiente' },
    { key: 'guardianPhone', label: 'Teléfono del acudiente' },
    { key: 'guardianEmail', label: 'Correo del acudiente' },
    STATE_COLUMN
  ],
  fields: [
    ...PERSON_FIELDS,
    { name: 'guardianName', label: 'Acudiente', type: 'text' },
    { name: 'guardianPhone', label: 'Teléfono del acudiente', type: 'text' },
    { name: 'guardianEmail', label: 'Correo del acudiente', type: 'email' }
  ],
  update: ['guardianName', 'guardianPhone', 'guardianEmail'],
  toggle: USER_TOGGLE
};
