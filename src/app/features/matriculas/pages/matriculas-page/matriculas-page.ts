import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { MATRICULAS_CONFIG } from '../../models/matriculas.config';

@Component({
  selector: 'app-matriculas-page',
  imports: [CrudManager],
  templateUrl: './matriculas-page.html'
})
export class MatriculasPage {
  readonly config = MATRICULAS_CONFIG;
}
