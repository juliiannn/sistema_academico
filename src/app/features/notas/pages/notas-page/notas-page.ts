import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { NOTAS_CONFIG } from '../../models/notas.config';

@Component({
  selector: 'app-notas-page',
  imports: [CrudManager],
  templateUrl: './notas-page.html'
})
export class NotasPage {
  readonly config = NOTAS_CONFIG;
}
