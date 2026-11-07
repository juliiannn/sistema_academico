import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth';
import { SelfView } from '../../../../shared/components/self-view/self-view';
import { PERFIL_DOCENTE_CONFIG, PERFIL_ESTUDIANTE_CONFIG } from '../../models/perfil.config';

// Módulo "Mi perfil" (/my/profile): la misma página para el docente y el estudiante, según el rol de la sesión
@Component({
  selector: 'app-perfil-page',
  imports: [SelfView],
  templateUrl: './perfil-page.html'
})
export class PerfilPage {

  private auth = inject(AuthService);

  readonly config = this.auth.role() === 'TEACHER' ? PERFIL_DOCENTE_CONFIG : PERFIL_ESTUDIANTE_CONFIG;
}
