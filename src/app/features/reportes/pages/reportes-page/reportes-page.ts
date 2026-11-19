import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Period } from '../../../../core/models/domain-types';
import { enumLabel, enumValues } from '../../../../core/models/enums';
import {
  ReportCatalogItem, ReportEmailRequest, ReportEmailResult, ReportFile, ReportFilterKey, ReportFilters,
  ReportFormat, ReportOptions, ReportRequest
} from '../../../../core/models/report.model';
import { ApiService } from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { formatDateTime } from '../../../../core/utils/datatable';
import { errorMessage } from '../../../../core/utils/format';
import { compareLabels } from '../../../../core/utils/grade-order';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

/** Qué se está haciendo en este momento (para deshabilitar botones y mostrar el mensaje de espera). */
type BusyAction = '' | ReportFormat | 'email';

/** Valores que el usuario escribe o elige en el formulario de filtros. */
interface FilterForm {
  cursoId: string;
  materiaId: string;
  periodo: string;
  desde: string;
  hasta: string;
}

const EMPTY_FILTERS: FilterForm = { cursoId: '', materiaId: '', periodo: '', desde: '', hasta: '' };

const ICONS: Record<string, string> = {
  consolidado: '📊', notas: '📝', asistencia: '📅', estudiantes: '👨‍🎓', piar: '🧩'
};

// Módulo de reportes: cada rol ve los reportes que su alcance permite (la API filtra los datos).
// Se descargan en Excel o PDF, o se envían como adjunto al correo registrado del usuario.
@Component({
  selector: 'app-reportes-page',
  imports: [Card, PageHeader, Alert, Button, LoadingState],
  templateUrl: './reportes-page.html',
  styleUrl: './reportes-page.css'
})
export class ReportesPage implements OnInit {

  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly catalog = signal<ReportCatalogItem[]>([]);
  readonly options = signal<ReportOptions>({ cursos: [], materias: [] });
  readonly files = signal<ReportFile[]>([]);

  readonly selectedType = signal<string>('');
  readonly form = signal<FilterForm>({ ...EMPTY_FILTERS });
  readonly emailFormats = signal<Record<ReportFormat, boolean>>({ xlsx: true, pdf: true });

  readonly busy = signal<BusyAction>('');
  readonly formError = signal('');
  readonly emailResult = signal<ReportEmailResult | null>(null);

  readonly icons = ICONS;
  readonly periods = enumValues('period').map(value => ({ value, label: enumLabel('period', value) }));
  readonly userEmail = computed(() => this.auth.email() || 'tu correo registrado');

  readonly selected = computed(() => this.catalog().find(c => c.tipo === this.selectedType()) ?? null);
  readonly courses = computed(() => [...this.options().cursos].sort((a, b) => compareLabels(a.nombre, b.nombre)));

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [catalog, options] = await Promise.all([
        this.api.get<ReportCatalogItem[]>('/reports/catalog'),
        this.api.get<ReportOptions>('/reports/options')
      ]);
      this.catalog.set(catalog.data);
      this.options.set(options.data);
      if (!this.selectedType() && catalog.data.length) {
        this.selectedType.set(catalog.data[0].tipo);
      }
      await this.loadFiles();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
    this.loading.set(false);
  }

  async loadFiles(): Promise<void> {
    try {
      this.files.set((await this.api.get<ReportFile[]>('/reports/files')).data);
    } catch {
      this.files.set([]);
    }
  }

  has(filter: ReportFilterKey): boolean {
    return this.selected()?.filtros.includes(filter) ?? false;
  }

  choose(tipo: string): void {
    this.selectedType.set(tipo);
    this.formError.set('');
    this.emailResult.set(null);
  }

  setField(field: keyof FilterForm, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
    this.formError.set('');
  }

  toggleFormat(format: ReportFormat, checked: boolean): void {
    this.emailFormats.update(f => ({ ...f, [format]: checked }));
  }

  clearFilters(): void {
    this.form.set({ ...EMPTY_FILTERS });
    this.formError.set('');
  }

  /** Solo se envían los filtros que el reporte elegido admite. */
  private filters(): ReportFilters | null {
    const f = this.form();
    if (this.has('desde') && this.has('hasta') && f.desde && f.hasta && f.desde > f.hasta) {
      this.formError.set('La fecha final no puede ser anterior a la inicial.');
      return null;
    }
    const filters: ReportFilters = {};
    if (this.has('curso') && f.cursoId) { filters.cursoId = Number(f.cursoId); }
    if (this.has('materia') && f.materiaId) { filters.materiaId = Number(f.materiaId); }
    if (this.has('periodo') && f.periodo) { filters.periodo = f.periodo as Period; }
    if (this.has('desde') && f.desde) { filters.desde = f.desde; }
    if (this.has('hasta') && f.hasta) { filters.hasta = f.hasta; }
    return filters;
  }

  async download(formato: ReportFormat): Promise<void> {
    const report = this.selected();
    const filters = this.filters();
    if (!report || !filters || this.busy()) {
      return;
    }
    this.busy.set(formato);
    this.emailResult.set(null);
    try {
      const body: ReportRequest = { tipo: report.tipo, formato, ...filters };
      const file = (await this.api.post<ReportFile>('/reports/generate', body)).data;
      await this.api.download(`/reports/files/${file.id}/download`, file.nombreArchivo);
      this.toast.show(`Reporte generado: ${file.filas} registro(s).`);
      await this.loadFiles();
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.busy.set('');
  }

  async sendEmail(): Promise<void> {
    const report = this.selected();
    const filters = this.filters();
    const formatos = (Object.keys(this.emailFormats()) as ReportFormat[]).filter(k => this.emailFormats()[k]);
    if (!report || !filters || this.busy()) {
      return;
    }
    if (!formatos.length) {
      this.formError.set('Elige al menos un formato (Excel o PDF) para enviar.');
      return;
    }
    this.busy.set('email');
    this.emailResult.set(null);
    try {
      const body: ReportEmailRequest = { tipo: report.tipo, formatos, ...filters };
      const result = (await this.api.post<ReportEmailResult>('/reports/email', body)).data;
      this.emailResult.set(result);
      await this.loadFiles();
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.busy.set('');
  }

  async downloadFile(file: ReportFile): Promise<void> {
    try {
      await this.api.download(`/reports/files/${file.id}/download`, file.nombreArchivo);
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
      await this.loadFiles();
    }
  }

  formatLabel(formato: ReportFormat): string {
    return formato === 'xlsx' ? 'Excel' : 'PDF';
  }

  date(value: string | null): string {
    return formatDateTime(value);
  }

  size(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  busyMessage(): string {
    switch (this.busy()) {
      case 'xlsx': return 'Generando el archivo Excel…';
      case 'pdf': return 'Generando el PDF…';
      case 'email': return 'Generando y enviando el reporte a tu correo… puede tardar unos segundos.';
      default: return '';
    }
  }
}
