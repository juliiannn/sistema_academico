import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Support } from '../../../../core/models/aux-api.model';
import { Option } from '../../../../core/models/crud.model';
import { Row } from '../../../../core/models/row.model';
import { AuxApiService } from '../../../../core/services/aux-api';
import { ToastService } from '../../../../core/services/toast';
import { TableAction } from '../../../../core/utils/datatable';
import { errorMessage } from '../../../../core/utils/format';
import { enumLabel, enumValues } from '../../../../core/models/enums';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { ChipList } from '../../../../shared/components/chip-list/chip-list';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ConnectionBanner } from '../../../../shared/components/connection-banner/connection-banner';
import { DataTable, TableActionEvent } from '../../../../shared/components/data-table/data-table';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { Modal } from '../../../../shared/components/modal/modal';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SelectFilter } from '../../../../shared/components/select-filter/select-filter';
import { SupportCard } from '../../../../shared/components/support-card/support-card';
import { APOYOS_COLUMNS } from '../../models/apoyo.model';
import { ApoyosService } from '../../services/apoyos';

// Listado de apoyos visuales (API auxiliar). Se filtra por NOMBRE de estudiante y por tipo.
@Component({
  selector: 'app-apoyos-page',
  imports: [
    Card, PageHeader, Button, Alert, SelectFilter, ChipList, DataTable, LoadingState,
    ConnectionBanner, Modal, SupportCard, ConfirmDialog
  ],
  templateUrl: './apoyos-page.html'
})
export class ApoyosPage implements OnInit {

  private api = inject(AuxApiService);
  private apoyos = inject(ApoyosService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly columns = APOYOS_COLUMNS;
  readonly students = signal<Option[]>([]);
  private names = new Map<string, string>();
  readonly typeOptions: Option[] = [
    { value: '', label: 'Todos' },
    ...enumValues('supportType').map(value => ({ value, label: enumLabel('supportType', value) }))
  ];

  readonly online = this.api.online;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<Row[]>([]);
  readonly typeFilter = signal('');
  readonly studentFilter = signal('');
  readonly preview = signal<Support | null>(null);
  readonly toDeactivate = signal<Support | null>(null);

  readonly canCreate = computed(() => this.apoyos.canCreate());

  private items: Support[] = [];

  readonly rowActions = (row: Row): TableAction[] => {
    const support = row as Support;
    const actions: TableAction[] = [{ key: 'view', label: 'Ver', variant: 'secondary' }];
    if (support.estado && this.apoyos.canModify(support)) {
      actions.push({ key: 'edit', label: 'Editar', variant: 'secondary' });
      actions.push({ key: 'deactivate', label: 'Desactivar', variant: 'danger' });
    }
    return actions;
  };

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    const [students, names] = await Promise.all([this.apoyos.studentOptions(), this.apoyos.directory()]);
    this.students.set(students);
    this.names = names;
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.items = await this.api.listAllSupports({
        estudiante_email: this.studentFilter() || undefined,
        tipo: this.typeFilter() || undefined
      });
      this.api.online.set(true);
      this.rows.set(this.items.map(s => ({
        ...s,
        studentName: this.apoyos.nameOfEmail(s.estudiante_email, this.names),
        creatorName: this.apoyos.nameOfEmail(s.creado_por, this.names)
      })));
    } catch (e) {
      this.rows.set([]);
      this.error.set(errorMessage(e));
    }
    this.loading.set(false);
  }

  onStudent(email: string): void {
    this.studentFilter.set(email);
    void this.load();
  }

  onType(tipo: string): void {
    this.typeFilter.set(tipo);
    void this.load();
  }

  newSupport(): void {
    void this.router.navigate(['/piar/supports/new']);
  }

  onAction(event: TableActionEvent): void {
    const support = this.items.find(s => s.id === event.row['id']);
    if (!support) {
      return;
    }
    if (event.action === 'view') {
      void this.openPreview(support);
    } else if (event.action === 'edit') {
      void this.router.navigate(['/piar/supports', support.id, 'edit']);
    } else if (event.action === 'deactivate') {
      this.toDeactivate.set(support);
    }
  }

  private async openPreview(support: Support): Promise<void> {
    try {
      this.preview.set(await this.api.getSupport(support.id));
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
  }

  audienceOf(support: Support): string {
    return this.apoyos.nameOfEmail(support.estudiante_email, this.names);
  }

  async confirmDeactivate(): Promise<void> {
    const support = this.toDeactivate();
    this.toDeactivate.set(null);
    if (!support) {
      return;
    }
    try {
      await this.api.deactivateSupport(support.id);
      this.toast.show('Apoyo desactivado correctamente');
      await this.load();
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
  }
}
