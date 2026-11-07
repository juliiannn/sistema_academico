import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { ENTREGAS_DOCENTE_CONFIG, ENTREGAS_ESTUDIANTE_CONFIG } from '../../models/entregas.config';

// Una sola pantalla con dos caras según el módulo: /student/submissions (entrega) y /academic/submissions (califica)
@Component({
  selector: 'app-entregas-page',
  imports: [CrudManager],
  templateUrl: './entregas-page.html'
})
export class EntregasPage {
  private route = inject(ActivatedRoute);

  readonly config = this.route.snapshot.routeConfig?.path === 'student/submissions'
    ? ENTREGAS_ESTUDIANTE_CONFIG
    : ENTREGAS_DOCENTE_CONFIG;
}
