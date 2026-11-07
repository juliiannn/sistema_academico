import { EntityConfig } from '../../../core/models/crud.model';
import { PERSON_COLUMNS, PERSON_FIELDS, STATE_COLUMN, USER_TOGGLE } from '../../../core/models/person.config';

export const COORDINADORES_CONFIG: EntityConfig = {
  title: 'Coordinadores',
  description: 'Consulta y administra los coordinadores de la institución.',
  module: '/people/coordinators',
  endpoint: '/coordinators',
  columns: [
    ...PERSON_COLUMNS,
    { key: 'employeeCode', label: 'Código de empleado' },
    { key: 'area', label: 'Área', kind: 'enum', enumKey: 'area' },
    { key: 'assignmentDate', label: 'Fecha de asignación' },
    { key: 'educationLevel', label: 'Nivel educativo', kind: 'enum', enumKey: 'educationLevel' },
    STATE_COLUMN
  ],
  fields: [
    ...PERSON_FIELDS,
    { name: 'employeeCode', label: 'Código de empleado', type: 'text' },
    { name: 'area', label: 'Área', type: 'select', enumKey: 'area' },
    { name: 'assignmentDate', label: 'Fecha de asignación', type: 'date' },
    { name: 'educationLevel', label: 'Nivel educativo', type: 'select', enumKey: 'educationLevel' }
  ],
  update: ['employeeCode', 'area', 'assignmentDate', 'educationLevel'],
  toggle: USER_TOGGLE
};
