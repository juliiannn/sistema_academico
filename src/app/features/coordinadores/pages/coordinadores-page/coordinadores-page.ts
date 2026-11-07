import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { COORDINADORES_CONFIG } from '../../models/coordinadores.config';

@Component({
  selector: 'app-coordinadores-page',
  imports: [CrudManager],
  templateUrl: './coordinadores-page.html'
})
export class CoordinadoresPage {
  readonly config = COORDINADORES_CONFIG;
}
