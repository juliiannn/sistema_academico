import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { HORARIOS_CONFIG } from '../../models/horarios.config';

@Component({
  selector: 'app-horarios-page',
  imports: [CrudManager],
  templateUrl: './horarios-page.html'
})
export class HorariosPage {
  readonly config = HORARIOS_CONFIG;
}
