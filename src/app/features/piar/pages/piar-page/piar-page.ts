import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Option } from '../../../../core/models/crud.model';
import { enumLabel, enumValues } from '../../../../core/models/enums';
import { AuxApiService } from '../../../../core/services/aux-api';
import { ChipList } from '../../../../shared/components/chip-list/chip-list';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { buildPiarConfig } from '../../models/piar.config';
import { ReferenceService } from '../../../../core/services/references';

@Component({
  selector: 'app-piar-page',
  imports: [CrudManager, ChipList],
  templateUrl: './piar-page.html'
})
export class PiarPage {
  private api = inject(AuxApiService);
  private refs = inject(ReferenceService);
  readonly config = buildPiarConfig(() => this.refs.raw('/special-needs'));
  private router = inject(Router);

  // Un apartado (PIAR propio) por cada discapacidad
  readonly types: Option[] = enumValues('disability').map(value => ({ value, label: enumLabel('disability', value) }));

  openDisability(code: string): void {
    void this.router.navigate(['/piar/disability', code]);
  }

  // Cada cambio del PIAR queda en la auditoría de la API auxiliar (si está encendida)
  onChanged(event: { action: string; label: string }): void {
    const map: Record<string, string> = { create: 'CREATE', update: 'UPDATE', toggle: 'DELETE' };
    void this.api.logAudit(map[event.action] ?? 'OTHER', 'PIAR', event.label);
  }
}
