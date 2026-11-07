import { Component, inject } from '@angular/core';
import { AuxApiService } from '../../../../core/services/aux-api';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { COMUNICADOS_CONFIG } from '../../models/comunicados.config';

@Component({
  selector: 'app-comunicados-page',
  imports: [CrudManager],
  templateUrl: './comunicados-page.html'
})
export class ComunicadosPage {
  readonly config = COMUNICADOS_CONFIG;
  private aux = inject(AuxApiService);

  // Cada publicación queda en la auditoría (API auxiliar)
  onChanged(event: { action: string; label: string }): void {
    const map: Record<string, string> = { create: 'CREATE', update: 'UPDATE', toggle: 'DELETE' };
    void this.aux.logAudit(map[event.action] ?? 'OTHER', 'Comunicados', event.label);
  }
}
