import { ColumnDef, FieldDef, ToggleDef } from './crud.model';

// Datos comunes de toda persona (estudiante, docente, coordinador, rector, usuario)
export const PERSON_COLUMNS: ColumnDef[] = [
  { key: 'fullName', label: 'Nombre completo' },
  { key: 'documentType', label: 'Tipo de documento', kind: 'enum', enumKey: 'documentType' },
  { key: 'document', label: 'Documento' },
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'birthDate', label: 'Fecha de nacimiento' },
  { key: 'gender', label: 'Género', kind: 'enum', enumKey: 'gender' },
  { key: 'address', label: 'Dirección' }
];

export const PERSON_FIELDS: FieldDef[] = [
  { name: 'documentType', label: 'Tipo de documento', type: 'select', enumKey: 'documentType' },
  { name: 'document', label: 'Documento', type: 'text' },
  { name: 'email', label: 'Correo', type: 'email' },
  { name: 'fullName', label: 'Nombre completo', type: 'text' },
  { name: 'phone', label: 'Teléfono', type: 'text' },
  { name: 'birthDate', label: 'Fecha de nacimiento', type: 'date' },
  { name: 'gender', label: 'Género', type: 'select', enumKey: 'gender' },
  { name: 'address', label: 'Dirección', type: 'text' }
];

export const STATE_COLUMN: ColumnDef = { key: 'enabled', label: 'Estado', kind: 'bool' };

// El estado "activo" de una persona es el del usuario vinculado (se activa vía /users/{userId})
export const USER_TOGGLE: ToggleDef = {
  idField: 'userId',
  statusField: 'enabled',
  activeValue: true,
  activateUrl: id => `/users/${id}/activate`,
  deactivateUrl: id => `/users/${id}/deactivate`
};
