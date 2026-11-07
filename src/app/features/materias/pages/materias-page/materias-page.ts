import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { MATERIAS_CONFIG } from '../../models/materias.config';

@Component({
  selector: 'app-materias-page',
  imports: [CrudManager],
  templateUrl: './materias-page.html'
})
export class MateriasPage {
  readonly config = MATERIAS_CONFIG;
}
