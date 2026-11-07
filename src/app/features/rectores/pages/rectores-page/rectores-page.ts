import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { RECTORES_CONFIG } from '../../models/rectores.config';

@Component({
  selector: 'app-rectores-page',
  imports: [CrudManager],
  templateUrl: './rectores-page.html'
})
export class RectoresPage {
  readonly config = RECTORES_CONFIG;
}
