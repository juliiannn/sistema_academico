import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { ESTUDIANTES_CONFIG } from '../../models/estudiantes.config';

@Component({
  selector: 'app-estudiantes-page',
  imports: [CrudManager],
  templateUrl: './estudiantes-page.html'
})
export class EstudiantesPage {
  readonly config = ESTUDIANTES_CONFIG;
}
