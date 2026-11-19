import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { enumLabel } from '../../../../core/models/enums';
import {
  EmailConfig, EmailNotification, NotificationSetting, NotificationSettingUpdate, NotificationState,
  NotificationStats
} from '../../../../core/models/report.model';
import { ApiService } from '../../../../core/services/api';
import { ToastService } from '../../../../core/services/toast';
import { formatDateTime } from '../../../../core/utils/datatable';
import { errorMessage } from '../../../../core/utils/format';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { Modal } from '../../../../shared/components/modal/modal';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';

/** Filtros del historial de correos. */
interface HistoryFilters {
  estado: NotificationState | '';
  evento: string;
  q: string;
}

const PAGE_SIZE = 15;

const EMPTY_STATS: NotificationStats = { total: 0, enviados: 0, fallidos: 0, pendientes: 0, omitidos: 0, porEvento: {} };

// Panel del administrador: estado del servidor de correo, qué eventos envían notificaciones
// y el historial de cada correo (enviado, fallido, pendiente u omitido) con opción de reintentar.
@Component({
  selector: 'app-notificaciones-page',
  imports: [Card, PageHeader, Alert, Button, LoadingState, Modal, StatCard],
  templateUrl: './notificaciones-page.html',
  styleUrl: './notificaciones-page.css'
})
export class NotificacionesPage implements OnInit {

  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly config = signal<EmailConfig | null>(null);
  readonly stats = signal<NotificationStats>(EMPTY_STATS);
  readonly settings = signal<NotificationSetting[]>([]);
  readonly history = signal<EmailNotification[]>([]);
  readonly historyLoading = signal(false);
  readonly filters = signal<HistoryFilters>({ estado: '', evento: '', q: '' });

  readonly busyId = signal<number | string | null>(null);
  readonly detail = signal<EmailNotification | null>(null);

  readonly page = signal(1);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.history().length / PAGE_SIZE)));
  readonly pagedHistory = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.history().slice(start, start + PAGE_SIZE);
  });
  readonly rangeText = computed(() => {
    const total = this.history().length;
    const start = (this.page() - 1) * PAGE_SIZE + 1;
    return `${start}–${Math.min(start + PAGE_SIZE - 1, total)} de ${total}`;
  });

  readonly states: NotificationState[] = ['ENVIADO', 'FALLIDO', 'PENDIENTE', 'OMITIDO'];

  readonly successRate = computed(() => {
    const s = this.stats();
    const attempted = s.enviados + s.fallidos;
    return attempted ? `${Math.round((s.enviados / attempted) * 100)} %` : '—';
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [config, settings] = await Promise.all([
        this.api.get<EmailConfig>('/notifications/config'),
        this.api.get<NotificationSetting[]>('/notifications/settings')
      ]);
      this.config.set(config.data);
      this.settings.set(settings.data);
      await this.refresh();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
    this.loading.set(false);
  }

  /** Recarga los contadores y el historial con los filtros actuales. */
  async refresh(): Promise<void> {
    this.historyLoading.set(true);
    try {
      const f = this.filters();
      const params = new URLSearchParams({ limit: '300' });
      if (f.estado) { params.set('estado', f.estado); }
      if (f.evento) { params.set('evento', f.evento); }
      if (f.q.trim()) { params.set('q', f.q.trim()); }
      const [stats, history] = await Promise.all([
        this.api.get<NotificationStats>('/notifications/stats'),
        this.api.get<EmailNotification[]>(`/notifications?${params.toString()}`)
      ]);
      this.stats.set(stats.data);
      this.history.set(history.data);
      this.page.set(Math.min(this.page(), this.totalPages()));
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.historyLoading.set(false);
  }

  setFilter(field: keyof HistoryFilters, value: string): void {
    this.filters.update(f => ({ ...f, [field]: value }));
    this.page.set(1);
    if (field !== 'q') {
      void this.refresh();
    }
  }

  async toggle(setting: NotificationSetting, activo: boolean): Promise<void> {
    this.busyId.set(setting.evento);
    try {
      const body: NotificationSettingUpdate = { activo };
      const updated = (await this.api.put<NotificationSetting>(`/notifications/settings/${setting.evento}`, body)).data;
      this.settings.update(list => list.map(s => (s.evento === updated.evento ? updated : s)));
      this.toast.show(`${updated.nombre}: ${updated.activo ? 'activado' : 'desactivado'}.`);
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.busyId.set(null);
  }

  async sendTest(): Promise<void> {
    this.busyId.set('test');
    try {
      const n = (await this.api.post<EmailNotification>('/notifications/test', {})).data;
      if (n.estado === 'ENVIADO') {
        this.toast.show(`Correo de prueba enviado a ${n.enviadoA ?? n.destinatario}.`);
      } else {
        this.toast.show(`Correo de prueba ${this.stateLabel(n.estado).toLowerCase()}: ${n.error ?? ''}`, 'error');
      }
      await this.refresh();
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.busyId.set(null);
  }

  async retry(n: EmailNotification): Promise<void> {
    this.busyId.set(n.id);
    try {
      const result = (await this.api.post<EmailNotification>(`/notifications/${n.id}/retry`, {})).data;
      this.toast.show(result.estado === 'ENVIADO' ? 'Correo reenviado.' : `Sigue sin enviarse: ${result.error ?? ''}`,
        result.estado === 'ENVIADO' ? 'success' : 'error');
      if (this.detail()?.id === n.id) {
        this.detail.set(result);
      }
      await this.refresh();
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.busyId.set(null);
  }

  goTo(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  canRetry(n: EmailNotification): boolean {
    return n.estado === 'FALLIDO' || n.estado === 'OMITIDO';
  }

  stateLabel(state: NotificationState): string {
    return enumLabel('notificationState', state);
  }

  stateClass(state: NotificationState): string {
    return state === 'ENVIADO' ? 'success' : state === 'FALLIDO' ? 'danger' : state === 'PENDIENTE' ? 'warning' : '';
  }

  eventCount(evento: string): number {
    return this.stats().porEvento[evento] ?? 0;
  }

  date(value: string | null): string {
    return formatDateTime(value);
  }
}
