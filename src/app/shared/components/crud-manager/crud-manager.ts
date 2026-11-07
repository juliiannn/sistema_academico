import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PermissionsService } from '../../../core/services/permissions';
import { ApiService } from '../../../core/services/api';
import { ReferenceService } from '../../../core/services/references';
import { ToastService } from '../../../core/services/toast';
import { EntityConfig, FieldDef, Option } from '../../../core/models/crud.model';
import { enumLabel, enumValues } from '../../../core/models/enums';
import { Row } from '../../../core/models/row.model';
import { TableAction } from '../../../core/utils/datatable';
import { errorMessage } from '../../../core/utils/format';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { Card } from '../card/card';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { DataTable, TableActionEvent } from '../data-table/data-table';
import { EntityForm } from '../entity-form/entity-form';
import { LoadingState } from '../loading-state/loading-state';
import { Modal } from '../modal/modal';
import { PageHeader } from '../page-header/page-header';
import { SelectFilter } from '../select-filter/select-filter';

type LoadState = 'loading' | 'ready' | 'error';

interface ModalState {
  mode: 'create' | 'edit';
  row: Row | null;
  fields: FieldDef[];
  form: FormGroup;
  options: Record<string, Option[]>;
}

interface ToggleInfo {
  id: unknown;
  activate: boolean;
  label: string;
  name?: string;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  variant: 'primary' | 'danger' | 'warning';
  run: () => void;
}

// Pantalla de gestión genérica (tabla + crear / editar / activar / restablecer).
// Cada feature (estudiantes, cursos, notas...) solo le pasa su configuración.
@Component({
  selector: 'app-crud-manager',
  imports: [
    Card, PageHeader, Button, SelectFilter, DataTable, LoadingState, Alert,
    Modal, ConfirmDialog, EntityForm
  ],
  templateUrl: './crud-manager.html'
})
export class CrudManager implements OnInit {

  readonly config = input.required<EntityConfig>();

  // Avisa a la pantalla que lo usa cuando se crea, edita o cambia el estado de un registro
  // Botones propios de la pantalla (config.extraActions): se avisa cuál se pulsó y en qué fila
  readonly rowAction = output<{ action: string; row: Row }>();

  readonly changed = output<{ action: 'create' | 'update' | 'toggle'; label: string }>();

  private api = inject(ApiService);
  private refs = inject(ReferenceService);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);

  readonly state = signal<LoadState>('loading');
  readonly rows = signal<Row[]>([]);
  readonly loadError = signal('');
  readonly filterOptions = signal<Option[]>([]);

  readonly modal = signal<ModalState | null>(null);
  readonly submitted = signal(false);
  readonly confirmState = signal<ConfirmState | null>(null);

  // Consulta activa: null = listado completo; si no, el endpoint del filtro por nombre
  private currentEndpoint: string | null = null;

  // Botones según la tabla role_modules (base de datos) para el módulo de esta pantalla
  readonly canCreate = computed(() => this.permissions.can(this.config().module, 'crear') && this.config().fields.length > 0);
  readonly canEdit = computed(() => !!this.config().update && this.permissions.can(this.config().module, 'editar'));
  readonly canToggle = computed(() => !!this.config().toggle && this.permissions.can(this.config().module, 'eliminar'));
  readonly canReset = computed(() => !!this.config().resetPassword && this.permissions.can(this.config().module, 'editar'));
  readonly hasActions = computed(() => this.canEdit() || this.canToggle() || this.canReset() || (this.config().extraActions?.length ?? 0) > 0);

  // Botones de cada fila (referencia estable: DataTable no se reconstruye)
  readonly rowActions = (row: Row): TableAction[] => {

    const actions: TableAction[] = (this.config().extraActions ?? []).map(a => ({ key: a.key, label: a.label, variant: a.variant }));

    if (this.canEdit()) {
      actions.push({ key: 'edit', label: 'Editar', variant: 'secondary' });
    }

    if (this.canToggle()) {
      const info = this.toggleInfo(row);

      if (info) {
        actions.push({ key: 'toggle', label: info.label, variant: info.activate ? 'primary' : 'danger' });
      }
    }

    if (this.canReset() && this.resetId(row) !== null) {
      actions.push({ key: 'reset', label: 'Restablecer contraseña', variant: 'warning' });
    }

    return actions;
  };

  ngOnInit(): void {
    void this.refreshFilterOptions();
    void this.load();
  }

  // ---------- listado ----------

  private async refreshFilterOptions(): Promise<void> {
    const filter = this.config().filter;
    this.filterOptions.set(filter ? await this.refs.options(filter.ref) : []);
  }

  async load(): Promise<void> {

    const cfg = this.config();
    const endpoint = this.currentEndpoint ?? cfg.listEndpoint ?? cfg.endpoint;

    try {

      const data = (await this.api.get(endpoint)).data;
      const rows = Array.isArray(data) ? data as Row[] : [];
      this.rows.set(cfg.transform ? cfg.transform(rows) : rows);
      this.state.set('ready');

    } catch (error) {

      this.loadError.set(errorMessage(error));
      this.state.set('error');

      console.error('Error cargando datos:', this.config().title, error);
    }
  }

  // El filtro trabaja con NOMBRES (el valor que llega es el id de la opción elegida)
  onFilter(id: string): void {

    const filter = this.config().filter;

    this.currentEndpoint = filter && id ? filter.path(id) : null;

    void this.load();
  }

  // ---------- acciones por fila ----------

  onAction(event: TableActionEvent): void {

    if (event.action === 'edit') {
      this.openEdit(event.row);
    } else if (event.action === 'toggle') {
      this.askToggle(event.row);
    } else if (event.action === 'reset') {
      this.askReset(event.row);
    } else {
      this.rowAction.emit({ action: event.action, row: event.row });
    }
  }

  toggleInfo(row: Row): ToggleInfo | null {

    const toggle = this.config().toggle;

    if (!toggle) {
      return null;
    }

    const id = row[toggle.idField];

    if (id === undefined || id === null) {
      return null;
    }

    if (row[toggle.statusField] === toggle.activeValue) {

      return toggle.deactivateUrl
        ? { id, activate: false, label: toggle.deactivateLabel || 'Desactivar' }
        : null;
    }

    return toggle.activateUrl
      ? { id, activate: true, label: toggle.activateLabel || 'Activar' }
      : null;
  }

  resetId(row: Row): unknown {

    const reset = this.config().resetPassword;

    if (!reset) {
      return null;
    }

    const id = row[reset.idField];

    return id === undefined ? null : id;
  }

  // Nombre legible del registro para los mensajes (nunca el id)
  private rowLabel(row: Row): string {
    return String(row['fullName'] ?? row['name'] ?? row['nombre'] ?? row['studentName'] ?? row['assignmentTitle'] ?? row['title'] ?? row['titulo'] ?? row['moduleName'] ?? 'este registro');
  }

  private askToggle(row: Row): void {

    const info = this.toggleInfo(row);

    if (!info) {
      return;
    }

    this.confirmState.set({
      title: info.label,
      message: `¿Seguro que deseas ${info.label.toLowerCase()} a "${this.rowLabel(row)}"?`,
      confirmText: info.label,
      variant: info.activate ? 'primary' : 'danger',
      run: () => this.toggleStatus({ ...info, name: this.rowLabel(row) })
    });
  }

  private askReset(row: Row): void {

    const id = this.resetId(row);

    this.confirmState.set({
      title: 'Restablecer contraseña',
      message:
        `¿Restablecer la contraseña de "${this.rowLabel(row)}"? ` +
        'Quedará igual a su número de documento y deberá cambiarla en el próximo inicio de sesión.',
      confirmText: 'Restablecer',
      variant: 'warning',
      run: () => this.resetPassword(id)
    });
  }

  runConfirm(): void {
    const state = this.confirmState();
    this.confirmState.set(null);
    state?.run();
  }

  async toggleStatus(info: ToggleInfo): Promise<void> {

    const toggle = this.config().toggle;

    const url = info.activate
      ? toggle?.activateUrl?.(info.id)
      : toggle?.deactivateUrl?.(info.id);

    if (!url) {
      return;
    }

    try {

      await this.api.put(url, {});

      this.toast.show(
        info.activate
          ? 'Registro activado correctamente'
          : 'Registro desactivado correctamente'
      );

      this.changed.emit({ action: 'toggle', label: `${info.activate ? 'Activó' : 'Desactivó'}: ${info.name ?? 'registro'} (${this.config().title})` });

      void this.load();

    } catch (error) {

      console.error('Error cambiando estado:', error);

      this.toast.show(errorMessage(error), 'error');
    }
  }

  async resetPassword(id: unknown): Promise<void> {

    const reset = this.config().resetPassword;

    if (!reset) {
      return;
    }

    try {

      await this.api.put(reset.url(id), {});

      this.toast.show(
        'Contraseña restablecida. El usuario deberá ' +
        'iniciar sesión con su documento como contraseña.'
      );

    } catch (error) {

      console.error('Error restableciendo contraseña:', error);

      this.toast.show(errorMessage(error), 'error');
    }
  }

  // ---------- modal crear / editar ----------

  // Un FormControl por campo (obligatorios salvo optional: true)
  private buildForm(fields: FieldDef[], row: Row | null): FormGroup {

    const controls: Record<string, FormControl<string>> = {};

    fields.forEach(field => {

      const validators = field.optional ? [] : [Validators.required];

      if (field.type === 'email') {
        validators.push(Validators.email);
      }

      controls[field.name] = new FormControl(
        row ? String(row[field.name] ?? '') : (field.defaultValue ?? ''),
        { nonNullable: true, validators }
      );
    });

    return new FormGroup(controls);
  }

  // Opciones legibles de cada selector: enums traducidos y referencias por NOMBRE
  private async buildOptions(fields: FieldDef[]): Promise<Record<string, Option[]>> {

    const options: Record<string, Option[]> = {};

    for (const field of fields) {

      if (field.type === 'select' && field.enumKey) {
        const key = field.enumKey;
        options[field.name] = enumValues(key).map(value => ({ value, label: enumLabel(key, value) }));
      } else if (field.type === 'ref' && field.ref) {
        options[field.name] = await this.refs.options(field.ref);
      }
    }

    return options;
  }

  private async open(mode: 'create' | 'edit', row: Row | null, fields: FieldDef[]): Promise<void> {

    this.submitted.set(false);

    const options = await this.buildOptions(fields);

    this.modal.set({
      mode,
      row,
      fields,
      form: this.buildForm(fields, row),
      options
    });
  }

  openCreate(): void {
    void this.open('create', null, this.config().fields);
  }

  openEdit(row: Row): void {

    const update = this.config().update;

    if (!update) {
      this.toast.show('Este módulo no tiene actualización disponible.', 'error');
      return;
    }

    void this.open('edit', row, this.config().fields.filter(field => update.includes(field.name)));
  }

  closeModal(): void {
    this.modal.set(null);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  async save(): Promise<void> {

    const modal = this.modal();

    if (!modal) {
      return;
    }

    this.submitted.set(true);

    if (modal.form.invalid) {
      modal.form.markAllAsTouched();
      return;
    }

    // Tipos: números, referencias (id elegido por NOMBRE) y Sí/No como booleanos
    let body: Row = { ...modal.form.getRawValue() };

    modal.fields.forEach(field => {
      const value = body[field.name];
      if (value === '' && field.optional) {
        body[field.name] = null;
      } else if (field.type === 'number' && value !== '') {
        body[field.name] = Number(value);
      } else if (field.type === 'ref' && /^\d+$/.test(String(value))) {
        body[field.name] = Number(value);
      } else if (field.enumKey === 'yesNo') {
        body[field.name] = value === 'true';
      }
    });

    const cfg = this.config();

    try {
      if (cfg.toBody) {
        body = await cfg.toBody(body, modal.mode, modal.row);
      }
    } catch (error) {
      this.toast.show(errorMessage(error), 'error');
      return;
    }

    try {

      if (modal.mode === 'create') {

        await this.api.post(cfg.endpoint, body);

        this.closeModal();
        this.toast.show('Registro creado correctamente');
        this.changed.emit({ action: 'create', label: `Creó un registro en ${cfg.title}` });

      } else {

        const row = modal.row ?? {};
        await this.api.put(cfg.updateUrl ? cfg.updateUrl(row) : `${cfg.endpoint}/${row['id']}`, body);

        this.closeModal();
        this.toast.show('Cambios guardados');
        this.changed.emit({ action: 'update', label: `Editó: ${this.rowLabel(row)} (${cfg.title})` });
      }

      void this.refreshFilterOptions();
      void this.load();

    } catch (error) {

      console.error('Error guardando:', error);

      this.toast.show(errorMessage(error), 'error');
    }
  }
}
