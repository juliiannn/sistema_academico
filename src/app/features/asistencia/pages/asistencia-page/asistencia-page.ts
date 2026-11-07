import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { ASISTENCIA_CONFIG } from '../../models/asistencia.config';

@Component({
  selector: 'app-asistencia-page',
  imports: [CrudManager],
  templateUrl: './asistencia-page.html'
})
export class AsistenciaPage {
  readonly config = ASISTENCIA_CONFIG;
}
