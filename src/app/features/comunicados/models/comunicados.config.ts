import { EntityConfig } from '../../../core/models/crud.model';

// Comunicados institucionales: los publica el rector (o el administrador) y los ven todos los roles
export const COMUNICADOS_CONFIG: EntityConfig = {
  title: 'Comunicados',
  description: 'Avisos de la institución para estudiantes, docentes y directivos.',
  module: '/announcements',
  endpoint: '/announcements',
  columns: [
    { key: 'titulo', label: 'Título' },
    { key: 'contenido', label: 'Comunicado' },
    { key: 'publicadoPorNombre', label: 'Publicado por' },
    { key: 'publicadoPorRol', label: 'Cargo', kind: 'enum', enumKey: 'role' },
    { key: 'creado', label: 'Publicado', kind: 'datetime' },
    { key: 'actualizado', label: 'Última edición', kind: 'datetime' }
  ],
  fields: [
    { name: 'titulo', label: 'Título', type: 'text' },
    { name: 'contenido', label: 'Comunicado', type: 'textarea' }
  ],
  update: ['titulo', 'contenido'],
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    deactivateUrl: id => `/announcements/${id}/deactivate`,
    deactivateLabel: 'Retirar'
  }
};
