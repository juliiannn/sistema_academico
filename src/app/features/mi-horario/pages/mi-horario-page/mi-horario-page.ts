import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth';
import { SelfView } from '../../../../shared/components/self-view/self-view';
import { HORARIO_DOCENTE_CONFIG, HORARIO_ESTUDIANTE_CONFIG } from '../../models/mi-horario.config';

// Módulo "Mi horario" (/my/schedule): la misma página para el docente y el estudiante, según el rol de la sesión
@Component({
  selector: 'app-mi-horario-page',
  imports: [SelfView],
  templateUrl: './mi-horario-page.html'
})
export class MiHorarioPage {

  private auth = inject(AuthService);

  readonly config = this.auth.role() === 'TEACHER' ? HORARIO_DOCENTE_CONFIG : HORARIO_ESTUDIANTE_CONFIG;
}
