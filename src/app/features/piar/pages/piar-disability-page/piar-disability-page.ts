import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DISABILITY_GUIDES, guideOf } from '../../../../core/models/disability-guide';
import { ColumnDef, Option } from '../../../../core/models/crud.model';
import { enumLabel } from '../../../../core/models/enums';
import { Row } from '../../../../core/models/row.model';
import { PermissionsService } from '../../../../core/services/permissions';
import { withDisability } from '../../../../core/utils/piar';
import { API_ENDPOINTS } from '../../../../core/config';
import { ApiService } from '../../../../core/services/api';
import { errorMessage } from '../../../../core/utils/format';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { ChipList } from '../../../../shared/components/chip-list/chip-list';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DisabilityGuide } from '../../../../shared/components/disability-guide/disability-guide';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

// Apartado propio de cada discapacidad: su guía PIAR, los estudiantes que la tienen y los apoyos que les corresponden
@Component({
  selector: 'app-piar-disability-page',
  imports: [Card, PageHeader, Button, Alert, ChipList, DataTable, DisabilityGuide],
  templateUrl: './piar-disability-page.html'
})
export class PiarDisabilityPage {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private permissions = inject(PermissionsService);

  readonly code = signal('');
  readonly error = signal('');
  readonly rows = signal<Row[]>([]);

  readonly valid = computed(() => this.code() in DISABILITY_GUIDES);
  readonly title = computed(() => enumLabel('disability', this.code()));
  readonly guide = computed(() => guideOf(this.code()));
  readonly canCreateSupport = computed(() => this.permissions.can('/piar/supports', 'crear'));

  readonly supportTypes = computed<Option[]>(() =>
    this.guide().supportTypes.map(value => ({ value, label: enumLabel('supportType', value) }))
  );

  readonly columns: ColumnDef[] = [
    { key: 'studentName', label: 'Estudiante' },
    { key: 'schoolYear', label: 'Año escolar' },
    { key: 'observaciones', label: 'Observaciones y ajustes' },
    { key: 'consentimientoAcudiente', label: 'Consentimiento', kind: 'enum', enumKey: 'yesNo' },
    { key: 'creado', label: 'Fecha de registro', kind: 'datetime' }
  ];

  constructor() {
    this.route.paramMap.subscribe(params => {
      this.code.set((params.get('code') ?? '').toUpperCase());
      void this.load();
    });
  }

  private async load(): Promise<void> {
    this.error.set('');
    this.rows.set([]);

    if (!this.valid()) {
      return;
    }
    try {
      const data = ((await this.api.get(API_ENDPOINTS.piar)).data ?? []) as Row[];
      this.rows.set(withDisability(data).filter(r => r['estado'] !== false && r['disability'] === this.code()));
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  newSupport(): void {
    void this.router.navigate(['/piar/supports/new']);
  }

  back(): void {
    void this.router.navigate(['/piar']);
  }
}
