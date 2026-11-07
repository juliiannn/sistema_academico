import { Component } from '@angular/core';
import { SelfView } from '../../../../shared/components/self-view/self-view';
import { MIS_NOTAS_CONFIG } from '../../models/mis-notas.config';

@Component({
  selector: 'app-mis-notas-page',
  imports: [SelfView],
  templateUrl: './mis-notas-page.html'
})
export class MisNotasPage {
  readonly config = MIS_NOTAS_CONFIG;
}
