import { Component, inject } from '@angular/core';
import { PermissionsService } from '../../../../core/services/permissions';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { PERMISOS_CONFIG } from '../../models/permisos.config';

@Component({
  selector: 'app-permisos-page',
  imports: [CrudManager],
  templateUrl: './permisos-page.html'
})
export class PermisosPage {
  readonly config = PERMISOS_CONFIG;
  private permissions = inject(PermissionsService);

  // Si se cambian los permisos del propio rol, el menú se recarga de inmediato desde la base de datos
  onChanged(): void {
    void this.permissions.load(true);
  }
}
