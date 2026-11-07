import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { ASIGNACIONES_CONFIG } from '../../models/asignaciones.config';

@Component({
  selector: 'app-asignaciones-page',
  imports: [CrudManager],
  templateUrl: './asignaciones-page.html'
})
export class AsignacionesPage {
  readonly config = ASIGNACIONES_CONFIG;
}
