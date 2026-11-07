import { EntityConfig, FieldDef } from '../../../core/models/crud.model';

const FLAGS: FieldDef[] = [
  { name: 'puedeVer', label: 'Puede ver (aparece en el menú)', type: 'select', enumKey: 'yesNo', defaultValue: 'true' },
  { name: 'puedeCrear', label: 'Puede crear', type: 'select', enumKey: 'yesNo', defaultValue: 'false' },
  { name: 'puedeEditar', label: 'Puede editar', type: 'select', enumKey: 'yesNo', defaultValue: 'false' },
  { name: 'puedeEliminar', label: 'Puede desactivar', type: 'select', enumKey: 'yesNo', defaultValue: 'false' },
  { name: 'alcance', label: 'Alcance de los datos', type: 'select', enumKey: 'scope', defaultValue: 'ALL' }
];

// Tabla rol x módulo (role_modules): de aquí sale el menú y los botones de cada rol.
// Lo que se cambie aquí se refleja al volver a iniciar sesión con ese rol (o al instante si es el propio rol).
export const PERMISOS_CONFIG: EntityConfig = {
  title: 'Roles y módulos',
  description: 'Define qué módulos ve cada rol y qué puede hacer en ellos. El menú de cada usuario se arma con esta tabla.',
  module: '/admin/permissions',
  endpoint: '/role-modules',
  columns: [
    { key: 'roleName', label: 'Rol', kind: 'enum', enumKey: 'role' },
    { key: 'moduleName', label: 'Módulo' },
    { key: 'puedeVer', label: 'Ver', kind: 'enum', enumKey: 'yesNo' },
    { key: 'puedeCrear', label: 'Crear', kind: 'enum', enumKey: 'yesNo' },
    { key: 'puedeEditar', label: 'Editar', kind: 'enum', enumKey: 'yesNo' },
    { key: 'puedeEliminar', label: 'Desactivar', kind: 'enum', enumKey: 'yesNo' },
    { key: 'alcance', label: 'Alcance', kind: 'enum', enumKey: 'scope' }
  ],
  fields: [
    { name: 'roleId', label: 'Rol', type: 'ref', ref: 'roles' },
    { name: 'moduleId', label: 'Módulo', type: 'ref', ref: 'modules' },
    ...FLAGS
  ],
  update: FLAGS.map(f => f.name),
  toggle: {
    idField: 'id',
    statusField: 'estado',
    activeValue: true,
    deactivateUrl: id => `/role-modules/${id}/deactivate`,
    deactivateLabel: 'Quitar del rol'
  },
  filter: {
    label: 'Ver permisos de',
    ref: 'roles',
    allLabel: 'Todos los roles',
    path: id => `/role-modules?role_id=${id}`
  }
};
