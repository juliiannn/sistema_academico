// Administración: roles, módulos y permisos (tabla rol × módulo).
import { Auditable, Entity } from './api.model';
import { PermissionScope } from './domain-types';

/** GET /roles */
export interface Role extends Entity, Auditable {
  nombre: string;
  descripcion: string | null;
}

/** GET /modules: cada pantalla del menú. */
export interface AppModule extends Entity, Auditable {
  nombre: string;
  ruta: string;
  descripcion: string | null;
}

/** GET /role-modules: qué puede hacer cada rol en cada módulo. */
export interface RoleModule extends Entity, Auditable {
  roleId: number;
  roleName: string;
  moduleId: number;
  moduleName: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcance: PermissionScope;
}
