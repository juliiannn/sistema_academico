import { Component, OnInit, inject, signal } from '@angular/core';
import { ColumnDef } from '../../../../core/models/crud.model';
import { Row } from '../../../../core/models/row.model';
import { API_ENDPOINTS } from '../../../../core/config';
import { ApiService } from '../../../../core/services/api';
import { ToastService } from '../../../../core/services/toast';
import { TableAction } from '../../../../core/utils/datatable';
import { errorMessage } from '../../../../core/utils/format';
import { withSubmissionState } from '../../../entregas/models/entregas.config';
import { AnswerBox } from '../../../../shared/components/answer-box/answer-box';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { DataTable, TableActionEvent } from '../../../../shared/components/data-table/data-table';
import { Modal } from '../../../../shared/components/modal/modal';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SubmissionCard } from '../../../../shared/components/submission-card/submission-card';

const NO_ANSWER = 'Sin responder';

// Actividades del estudiante, cada una con su cuadro de texto para responderle al docente
@Component({
  selector: 'app-student-activities',
  imports: [Card, PageHeader, Alert, Button, DataTable, Modal, AnswerBox, SubmissionCard],
  templateUrl: './student-activities.html'
})
export class StudentActivities implements OnInit {

  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly rows = signal<Row[]>([]);
  readonly error = signal('');
  readonly selected = signal<Row | null>(null);
  readonly saving = signal(false);
  readonly modalError = signal('');

  readonly columns: ColumnDef[] = [
    { key: 'subjectName', label: 'Materia' },
    { key: 'title', label: 'Actividad' },
    { key: 'description', label: 'Descripción' },
    { key: 'dueDate', label: 'Fecha límite' },
    { key: 'state', label: 'Mi respuesta' },
    { key: 'grade', label: 'Nota' }
  ];

  readonly rowActions = (row: Row): TableAction[] => {
    const state = row['state'];
    if (state === 'Calificada') {
      return [{ key: 'open', label: 'Ver nota', variant: 'secondary' }];
    }
    if (state === 'Pendiente de calificar') {
      return [{ key: 'open', label: 'Ver / editar respuesta', variant: 'secondary' }];
    }
    return [{ key: 'open', label: 'Responder', variant: 'primary' }];
  };

  ngOnInit(): void {
    void this.load();
  }

  // La respuesta activa de cada actividad (si la hay) se une a la fila de la actividad
  async load(): Promise<void> {
    try {
      const activities = (await this.api.get('/assignments/me')).data as Row[];
      const submissions = withSubmissionState(((await this.api.get(API_ENDPOINTS.mySubmissions)).data ?? []) as Row[]);

      this.rows.set(activities.map(a => {
        const mine = submissions
          .filter(s => s['assignmentId'] === a['id'])
          .sort((x, y) => Number(y['estado'] !== false) - Number(x['estado'] !== false) || String(y['actualizado']).localeCompare(String(x['actualizado'])))[0];

        return {
          ...a,
          submission: mine ?? null,
          state: mine && mine['estado'] !== false ? (mine['calificada'] ? 'Calificada' : 'Pendiente de calificar') : NO_ANSWER,
          grade: mine && mine['estado'] !== false ? mine['nota'] ?? '' : ''
        };
      }));
      this.error.set('');
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  onAction(event: TableActionEvent): void {
    this.modalError.set('');
    this.selected.set(this.rows().find(r => r['id'] === event.row['id']) ?? null);
  }

  close(): void {
    this.selected.set(null);
  }

  activeSubmission(row: Row): Row | null {
    const s = row['submission'] as Row | null;
    return s && s['estado'] !== false ? s : null;
  }

  isGraded(row: Row): boolean {
    return row['state'] === 'Calificada';
  }

  async send(text: string): Promise<void> {
    const row = this.selected();
    if (!row) {
      return;
    }

    const existing = this.activeSubmission(row);
    this.saving.set(true);
    this.modalError.set('');

    try {
      if (existing) {
        await this.api.put(`${API_ENDPOINTS.submissions}/${existing['id']}`, { contenido: text });
        this.toast.show('Respuesta actualizada');
      } else {
        await this.api.post(API_ENDPOINTS.submissions, { assignmentId: row['id'], contenido: text });
        this.toast.show('Respuesta enviada a tu docente');
      }
      this.close();
      await this.load();
    } catch (e) {
      this.modalError.set(errorMessage(e));
    }

    this.saving.set(false);
  }

  async withdraw(): Promise<void> {
    const existing = this.selected() ? this.activeSubmission(this.selected() as Row) : null;
    if (!existing) {
      return;
    }
    try {
      await this.api.put(`${API_ENDPOINTS.submissions}/${existing['id']}/deactivate`, {});
      this.toast.show('Respuesta retirada. Puedes escribir otra.');
      this.close();
      await this.load();
    } catch (e) {
      this.modalError.set(errorMessage(e));
    }
  }
}
