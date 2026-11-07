import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { guideOf } from '../../../../core/models/disability-guide';
import { Support } from '../../../../core/models/aux-api.model';
import { ColumnDef } from '../../../../core/models/crud.model';
import { enumLabel } from '../../../../core/models/enums';
import { Row } from '../../../../core/models/row.model';
import { AuxApiService } from '../../../../core/services/aux-api';
import { API_ENDPOINTS } from '../../../../core/config';
import { ApiService } from '../../../../core/services/api';
import { errorMessage } from '../../../../core/utils/format';
import { withDisability } from '../../../../core/utils/piar';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { ConnectionBanner } from '../../../../shared/components/connection-banner/connection-banner';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DisabilityGuide } from '../../../../shared/components/disability-guide/disability-guide';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SupportCard } from '../../../../shared/components/support-card/support-card';

// "Mi apoyo": lo que el estudiante necesita para realizar sus actividades según su PIAR
@Component({
  selector: 'app-mi-apoyo-page',
  imports: [Card, PageHeader, Button, Alert, ConnectionBanner, DataTable, DisabilityGuide, EmptyState, SupportCard],
  templateUrl: './mi-apoyo-page.html'
})
export class MiApoyoPage implements OnInit {

  private main = inject(ApiService);
  private api = inject(AuxApiService);
  private router = inject(Router);

  readonly online = this.api.online;
  readonly piar = signal<Row | null>(null);
  readonly pending = signal<Row[]>([]);
  readonly supports = signal<Support[]>([]);
  readonly error = signal('');
  readonly supportsError = signal('');

  readonly title = computed(() => enumLabel('disability', this.piar()?.['disability']));
  readonly guide = computed(() => guideOf(String(this.piar()?.['disability'] ?? 'OTHER')));

  readonly columns: ColumnDef[] = [
    { key: 'title', label: 'Actividad' },
    { key: 'subjectName', label: 'Materia' },
    { key: 'dueDate', label: 'Fecha de entrega' },
    { key: 'description', label: 'Descripción' }
  ];

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      // GET /piars/me devuelve los PIAR vigentes del estudiante (el más reciente primero)
      const mine = ((await this.main.get(`${API_ENDPOINTS.piar}/me`)).data ?? []) as Row[];
      this.piar.set(withDisability(mine)[0] ?? null);
      const today = new Date().toISOString().slice(0, 10);
      const all = (await this.main.get('/assignments/me')).data as Row[];
      this.pending.set((all ?? []).filter(a => String(a['dueDate']) >= today));
    } catch (e) {
      this.error.set(errorMessage(e));
    }
    await this.loadSupports();
  }

  async loadSupports(): Promise<void> {
    this.supportsError.set('');
    try {
      this.supports.set(await this.api.mySupports());
      this.api.online.set(true);
    } catch (e) {
      this.supportsError.set(errorMessage(e));
    }
  }

  goSubmissions(): void {
    void this.router.navigate(['/student/submissions']);
  }
}
