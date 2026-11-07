import { EntityConfig } from '../../../core/models/crud.model';
import { PERSON_COLUMNS, PERSON_FIELDS, STATE_COLUMN, USER_TOGGLE } from '../../../core/models/person.config';

export const RECTORES_CONFIG: EntityConfig = {
  title: 'Rectores',
  description: 'Consulta y administra los rectores de la institución.',
  module: '/people/rectors',
  endpoint: '/rectors',
  columns: [
    ...PERSON_COLUMNS,
    { key: 'employeeCode', label: 'Código de empleado' },
    { key: 'appointmentDate', label: 'Fecha de nombramiento' },
    { key: 'administrativePeriod', label: 'Periodo administrativo' },
    { key: 'educationLevel', label: 'Nivel educativo', kind: 'enum', enumKey: 'educationLevel' },
    STATE_COLUMN
  ],
  fields: [
    ...PERSON_FIELDS,
    { name: 'employeeCode', label: 'Código de empleado', type: 'text' },
    { name: 'appointmentDate', label: 'Fecha de nombramiento', type: 'date' },
    { name: 'administrativePeriod', label: 'Periodo administrativo', type: 'text' },
    { name: 'educationLevel', label: 'Nivel educativo', type: 'select', enumKey: 'educationLevel' }
  ],
  update: ['employeeCode', 'appointmentDate', 'administrativePeriod', 'educationLevel'],
  toggle: USER_TOGGLE
};
