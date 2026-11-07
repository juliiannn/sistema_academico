import { Component } from '@angular/core';
import { SelfView } from '../../../../shared/components/self-view/self-view';
import { MI_ASISTENCIA_CONFIG } from '../../models/mi-asistencia.config';

@Component({
  selector: 'app-mi-asistencia-page',
  imports: [SelfView],
  templateUrl: './mi-asistencia-page.html'
})
export class MiAsistenciaPage {
  readonly config = MI_ASISTENCIA_CONFIG;
}
