import { EntityConfig } from '../../../core/models/crud.model';

export const MATERIAS_CONFIG: EntityConfig = {
  title: 'Materias',
  description: 'Asignaturas que se dictan en la institución.',
  module: '/academic/subjects',
  endpoint: '/subjects',
  columns: [
    { key: 'name', label: 'Materia' },
    { key: 'estado', label: 'Estado', kind: 'bool' }
  ],
  fields: [{ name: 'name', label: 'Nombre de la materia', type: 'text' }],
  update: ['name'],
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    activateUrl: id => `/subjects/${id}/activate`,
    deactivateUrl: id => `/subjects/${id}/deactivate`
  }
};
