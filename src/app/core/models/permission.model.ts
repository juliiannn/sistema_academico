// Fila de GET /auth/me/permissions: un módulo de la tabla modules y lo que el rol puede hacer en él (tabla role_modules)
export interface ModulePermission {
  modulo: string;          // nombre del módulo (se muestra en el menú)
  ruta: string;            // ruta del frontend, por ejemplo /academic/grades
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;  // eliminar = cambiar el estado (borrado lógico)
  alcance: 'ALL' | 'ASSIGNED' | 'OWN';
}

export type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar';
