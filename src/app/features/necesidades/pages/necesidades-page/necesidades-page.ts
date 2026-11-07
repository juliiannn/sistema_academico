import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { NECESIDADES_CONFIG } from '../../models/necesidades.config';

@Component({
  selector: 'app-necesidades-page',
  imports: [CrudManager],
  templateUrl: './necesidades-page.html'
})
export class NecesidadesPage {
  readonly config = NECESIDADES_CONFIG;
}
