import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { DOCENTES_CONFIG } from '../../models/docentes.config';

@Component({
  selector: 'app-docentes-page',
  imports: [CrudManager],
  templateUrl: './docentes-page.html'
})
export class DocentesPage {
  readonly config = DOCENTES_CONFIG;
}
