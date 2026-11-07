import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { CURSOS_CONFIG } from '../../models/cursos.config';

@Component({
  selector: 'app-cursos-page',
  imports: [CrudManager],
  templateUrl: './cursos-page.html'
})
export class CursosPage {
  readonly config = CURSOS_CONFIG;
}
