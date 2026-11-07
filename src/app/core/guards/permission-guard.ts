import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { PermissionAction } from '../models/permission.model';
import { AuthService } from '../services/auth';
import { PermissionsService } from '../services/permissions';
import { ToastService } from '../services/toast';

// Deja entrar a una ruta SOLO si la tabla role_modules le da permiso al rol sobre ese módulo.
// data.module = ruta del módulo (por defecto, la propia ruta) · data.action = ver | crear | editar (por defecto ver)
export const permissionGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {

  const auth = inject(AuthService);
  const permissions = inject(PermissionsService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.logged()) {
    return router.parseUrl('/login');
  }

  try {
    await permissions.load();
  } catch {
    toast.show('No se pudieron cargar los módulos de tu rol. Verifica que la API esté encendida.', 'error');
    return false;
  }

  const module = (route.data['module'] as string | undefined) ?? '/' + (route.routeConfig?.path ?? '');
  const action = (route.data['action'] as PermissionAction | undefined) ?? 'ver';

  if (permissions.can(module, action)) {
    return true;
  }

  toast.show('Tu rol no tiene permiso para ese módulo.', 'error');
  return router.parseUrl(permissions.firstPath());
};
