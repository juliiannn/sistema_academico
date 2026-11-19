import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CrudChange, Option } from '../../../../core/models/crud.model';
import { enumLabel, enumValues } from '../../../../core/models/enums';
import { AuxApiService } from '../../../../core/services/aux-api';
import { ChipList } from '../../../../shared/components/chip-list/chip-list';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { buildPiarConfig } from '../../models/piar.config';
import { Piar, SpecialNeed } from '../../../../core/models/piar.model';
import { asEntity } from '../../../../core/models/row.model';
import { TableActionEvent } from '../../../../shared/components/data-table/data-table';
import { ReferenceService } from '../../../../core/services/references';

@Component({
  selector: 'app-piar-page',
  imports: [CrudManager, ChipList],
  templateUrl: './piar-page.html'
})
export class PiarPage {
  private api = inject(AuxApiService);
  private refs = inject(ReferenceService);
  readonly config = buildPiarConfig(() => this.refs.raw<SpecialNeed>('/special-needs'));
  private router = inject(Router);

  // Un apartado (PIAR propio) por cada discapacidad
  readonly types: Option[] = enumValues('disability').map(value => ({ value, label: enumLabel('disability', value) }));

  openDisability(code: string): void {
    void this.router.navigate(['/piar/disability', code]);
  }

  // "Seguimiento": metas, ajustes razonables por materia y avance por periodo del plan
  onRowAction(event: TableActionEvent): void {
    if (event.action === 'plan') {
      void this.router.navigate(['/piar/plan', asEntity<Piar>(event.row).id]);
    }
  }

  // Cada cambio del PIAR queda en la auditoría de la API auxiliar (si está encendida)
  onChanged(event: CrudChange): void {
    const map: Record<string, string> = { create: 'CREATE', update: 'UPDATE', toggle: 'DELETE' };
    void this.api.logAudit(map[event.action] ?? 'OTHER', 'PIAR', event.label);
  }
}
