import { Component, OnInit, inject, signal } from '@angular/core';
import { AuditLog } from '../../../../core/models/aux-api.model';
import { ColumnDef, Option } from '../../../../core/models/crud.model';
import { enumLabel, enumValues } from '../../../../core/models/enums';
import { AuxApiService } from '../../../../core/services/aux-api';
import { errorMessage } from '../../../../core/utils/format';
import { Alert } from '../../../../shared/components/alert/alert';
import { Card } from '../../../../shared/components/card/card';
import { ChipList } from '../../../../shared/components/chip-list/chip-list';
import { ConnectionBanner } from '../../../../shared/components/connection-banner/connection-banner';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

// Registro de auditoría (solo ADMIN y RECTOR): quién hizo qué, y cuándo
@Component({
  selector: 'app-auditoria-page',
  imports: [Card, PageHeader, Alert, ChipList, ConnectionBanner, DataTable, LoadingState],
  templateUrl: './auditoria-page.html'
})
export class AuditoriaPage implements OnInit {

  private api = inject(AuxApiService);

  readonly online = this.api.online;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly logs = signal<AuditLog[]>([]);
  readonly action = signal('');

  readonly columns: ColumnDef[] = [
    { key: 'creado', label: 'Fecha', kind: 'datetime' },
    { key: 'usuario_email', label: 'Usuario' },
    { key: 'rol', label: 'Rol', kind: 'enum', enumKey: 'role' },
    { key: 'accion', label: 'Acción', kind: 'enum', enumKey: 'auditAction' },
    { key: 'modulo', label: 'Módulo' },
    { key: 'detalle', label: 'Detalle' }
  ];

  readonly actionOptions: Option[] = [
    { value: '', label: 'Todas' },
    ...enumValues('auditAction').map(value => ({ value, label: enumLabel('auditAction', value) }))
  ];

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.logs.set(await this.api.listAuditLogs({ accion: this.action() || undefined }));
      this.api.online.set(true);
    } catch (e) {
      this.logs.set([]);
      this.error.set(errorMessage(e));
    }
    this.loading.set(false);
  }

  onAction(value: string): void {
    this.action.set(value);
    void this.load();
  }
}
