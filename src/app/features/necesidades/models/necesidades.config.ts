import { EntityConfig } from '../../../core/models/crud.model';

// Catálogo special_needs: tipos de discapacidad / necesidad educativa que se asignan en el PIAR
export const NECESIDADES_CONFIG: EntityConfig = {
  title: 'Necesidades educativas',
  description: 'Catálogo de discapacidades y necesidades educativas que se registran en el PIAR de cada estudiante.',
  module: '/piar/special-needs',
  endpoint: '/special-needs',
  listEndpoint: '/special-needs?include_inactive=true',
  columns: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado', label: 'Estado', kind: 'bool' }
  ],
  fields: [
    { name: 'nombre', label: 'Nombre', type: 'text' },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', optional: true }
  ],
  update: ['nombre', 'descripcion'],
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    activateUrl: id => `/special-needs/${id}/activate`,
    deactivateUrl: id => `/special-needs/${id}/deactivate`
  }
};
