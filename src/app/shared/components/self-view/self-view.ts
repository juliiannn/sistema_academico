import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { SelfViewConfig } from '../../../core/models/crud.model';
import { enumLabel } from '../../../core/models/enums';
import { Row } from '../../../core/models/row.model';
import { errorMessage } from '../../../core/utils/format';
import { Alert } from '../alert/alert';
import { Card } from '../card/card';
import { DataTable } from '../data-table/data-table';
import { DetailItem, DetailList } from '../detail-list/detail-list';
import { EmptyState } from '../empty-state/empty-state';
import { LoadingState } from '../loading-state/loading-state';
import { PageHeader } from '../page-header/page-header';

// Pantalla personal de solo lectura (Mi perfil, Mis notas, Mi horario...): tabla o ficha de datos
@Component({
  selector: 'app-self-view',
  imports: [Card, PageHeader, Alert, DataTable, DetailList, EmptyState, LoadingState],
  templateUrl: './self-view.html'
})
export class SelfView implements OnInit {

  readonly config = input.required<SelfViewConfig>();

  private api = inject(ApiService);

  readonly rows = signal<Row[]>([]);
  readonly record = signal<Row | null>(null);
  readonly error = signal('');
  readonly loading = signal(true);

  readonly columns = computed(() => this.config().columns ?? []);

  // Ficha: solo los datos con su etiqueta en español (sin ids)
  readonly details = computed<DetailItem[]>(() => {

    const record = this.record();

    if (!record) {
      return [];
    }

    return (this.config().details ?? [])
      .filter(detail => record[detail.key] !== undefined && record[detail.key] !== null && record[detail.key] !== '')
      .map(detail => ({
        label: detail.label,
        value: enumLabel(detail.enumKey, record[detail.key])
      }));
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {

    try {

      const data = (await this.api.get(this.config().endpoint)).data;

      if (Array.isArray(data)) {
        this.rows.set(data);
      } else if (typeof data === 'object' && data !== null) {
        this.record.set(data);
      }

    } catch (e) {

      this.error.set(errorMessage(e));
      console.error('Error cargando datos personales:', e);
    }

    this.loading.set(false);
  }
}
