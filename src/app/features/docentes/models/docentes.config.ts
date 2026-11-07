import { EntityConfig } from '../../../core/models/crud.model';
import { PERSON_COLUMNS, PERSON_FIELDS, STATE_COLUMN, USER_TOGGLE } from '../../../core/models/person.config';

export const DOCENTES_CONFIG: EntityConfig = {
  title: 'Docentes',
  description: 'Consulta y administra los docentes de la institución.',
  module: '/people/teachers',
  endpoint: '/teachers',
  columns: [
    ...PERSON_COLUMNS,
    { key: 'employeeCode', label: 'Código de empleado' },
    { key: 'hireDate', label: 'Fecha de contratación' },
    { key: 'profession', label: 'Profesión' },
    { key: 'specialty', label: 'Especialidad' },
    { key: 'educationLevel', label: 'Nivel educativo', kind: 'enum', enumKey: 'educationLevel' },
    { key: 'contractType', label: 'Tipo de contrato', kind: 'enum', enumKey: 'contractType' },
    STATE_COLUMN
  ],
  fields: [
    ...PERSON_FIELDS,
    { name: 'employeeCode', label: 'Código de empleado', type: 'text' },
    { name: 'hireDate', label: 'Fecha de contratación', type: 'date' },
    { name: 'profession', label: 'Profesión', type: 'text' },
    { name: 'specialty', label: 'Especialidad', type: 'text' },
    { name: 'educationLevel', label: 'Nivel educativo', type: 'select', enumKey: 'educationLevel' },
    { name: 'contractType', label: 'Tipo de contrato', type: 'select', enumKey: 'contractType' }
  ],
  update: ['employeeCode', 'hireDate', 'profession', 'specialty', 'educationLevel', 'contractType'],
  toggle: USER_TOGGLE
};
