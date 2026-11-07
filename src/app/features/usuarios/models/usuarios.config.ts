import { EntityConfig } from '../../../core/models/crud.model';
import { PERSON_COLUMNS, PERSON_FIELDS, STATE_COLUMN } from '../../../core/models/person.config';

export const USUARIOS_CONFIG: EntityConfig = {
  title: 'Usuarios',
  description: 'Administra las cuentas de acceso: datos, activación y restablecimiento de contraseña.',
  module: '/admin/users',
  endpoint: '/users',
  columns: [
    ...PERSON_COLUMNS,
    { key: 'role', label: 'Rol', kind: 'enum', enumKey: 'role' },
    STATE_COLUMN
  ],
  fields: [...PERSON_FIELDS],
  update: PERSON_FIELDS.map(field => field.name),
  toggle: {
    idField: 'id',
    statusField: 'enabled',
    activeValue: true,
    activateUrl: id => `/users/${id}/activate`,
    deactivateUrl: id => `/users/${id}/deactivate`
  },
  resetPassword: {
    idField: 'id',
    url: id => `/users/${id}/reset-password`
  }
};
