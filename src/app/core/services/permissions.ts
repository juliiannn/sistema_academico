import { Injectable, computed, inject, signal } from '@angular/core';
import { API_ENDPOINTS, MAIN_API } from '../config';
import { NavGroup, NavItem, buildNavGroups, toNavItem } from '../models/nav.config';
import { ModulePermission, PermissionAction } from '../models/permission.model';
import { httpJson } from '../utils/http';
import { AuthService } from './auth';

// Módulos y permisos del rol, cargados ÚNICAMENTE de la base de datos (tabla role_modules → GET /auth/me/permissions).
// Con esta información se arma el menú, se protegen las rutas y se muestran u ocultan los botones Crear / Editar / Desactivar.
@Injectable({ providedIn: 'root' })
export class PermissionsService {

  private auth = inject(AuthService);

  private readonly list = signal<ModulePermission[]>([]);
  private loadedFor: string | null = null;     // token con el que se cargó (al cambiar de usuario se recarga)
  private pending: Promise<ModulePermission[]> | null = null;

  readonly modules = this.list.asReadonly();
  readonly navGroups = computed<NavGroup[]>(() => buildNavGroups(this.list()));
  readonly navItems = computed<NavItem[]>(() => this.list().filter(p => p.puedeVer).map(toNavItem));

  /** Pide los permisos a la API (una vez por sesión, o siempre si force = true). */
  async load(force = false): Promise<ModulePermission[]> {
    const token = this.auth.token();

    if (!token) {
      this.clear();
      return [];
    }
    if (!force && this.loadedFor === token) {
      return this.list();
    }
    if (!this.pending) {
      this.pending = (async () => {
        const res = await httpJson(MAIN_API.baseUrl + API_ENDPOINTS.permissions, 'GET', undefined, token, MAIN_API.timeoutMs);
        const rows = (Array.isArray(res.data) ? res.data : []) as ModulePermission[];
        this.list.set(rows);
        this.loadedFor = token;
        return rows;
      })().finally(() => { this.pending = null; });
    }
    return this.pending;
  }

  clear(): void {
    this.list.set([]);
    this.loadedFor = null;
  }

  /** Permiso del rol sobre el módulo con esa ruta del frontend. */
  find(ruta: string): ModulePermission | undefined {
    const key = '/' + ruta.replace(/^\//, '');
    return this.list().find(p => p.ruta === key);
  }

  can(ruta: string, action: PermissionAction = 'ver'): boolean {
    const p = this.find(ruta);
    if (!p || !p.puedeVer) {
      return false;
    }
    switch (action) {
      case 'crear': return p.puedeCrear;
      case 'editar': return p.puedeEditar;
      case 'eliminar': return p.puedeEliminar;
      default: return true;
    }
  }

  /** Primera pantalla permitida (a donde se redirige después del login). */
  firstPath(): string {
    const items = this.navGroups().flatMap(g => g.items);
    return items.length ? '/' + items[0].path : '/login';
  }
}
