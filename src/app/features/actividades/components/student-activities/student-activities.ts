import { Component, OnInit, inject, signal } from '@angular/core';
import { ColumnDef } from '../../../../core/models/crud.model';
import { Decimal } from '../../../../core/models/api.model';
import { Assignment, Submission, SubmissionRequest, SubmissionUpdateRequest } from '../../../../core/models/academic.model';
import { Row, asEntity } from '../../../../core/models/row.model';
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
/** Actividad del estudiante con su respuesta activa (si la tiene) y el estado para la tabla. */
interface StudentActivity extends Assignment {
  submission: Submission | null;
  state: string;
  grade: Decimal | '';
}

@Component({
  selector: 'app-student-activities',
  imports: [Card, PageHeader, Alert, Button, DataTable, Modal, AnswerBox, SubmissionCard],
  templateUrl: './student-activities.html'
})
export class StudentActivities implements OnInit {

  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly rows = signal<StudentActivity[]>([]);
  readonly error = signal('');
  readonly selected = signal<StudentActivity | null>(null);
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
    const state = asEntity<StudentActivity>(row).state;
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
      const activities = (await this.api.get<Assignment[]>('/assignments/me')).data ?? [];
      const submissions = withSubmissionState((await this.api.get<Submission[]>(API_ENDPOINTS.mySubmissions)).data ?? []);

      this.rows.set(activities.map<StudentActivity>(a => {
        const mine = submissions
          .filter(s => s.assignmentId === a.id)
          .sort((x, y) => Number(y.estado !== false) - Number(x.estado !== false) || String(y.actualizado).localeCompare(String(x.actualizado)))[0];
        const active = mine && mine.estado !== false;

        return {
          ...a,
          submission: mine ?? null,
          state: active ? (mine.calificada ? 'Calificada' : 'Pendiente de calificar') : NO_ANSWER,
          grade: active ? mine.nota ?? '' : ''
        };
      }));
      this.error.set('');
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  onAction(event: TableActionEvent): void {
    this.modalError.set('');
    const id = asEntity<StudentActivity>(event.row).id;
    this.selected.set(this.rows().find(r => r.id === id) ?? null);
  }

  close(): void {
    this.selected.set(null);
  }

  activeSubmission(row: StudentActivity): Submission | null {
    const s = row.submission;
    return s && s.estado !== false ? s : null;
  }

  isGraded(row: StudentActivity): boolean {
    return row.state === 'Calificada';
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
        const body: SubmissionUpdateRequest = { contenido: text };
        await this.api.put(`${API_ENDPOINTS.submissions}/${existing.id}`, body);
        this.toast.show('Respuesta actualizada');
      } else {
        const body: SubmissionRequest = { assignmentId: row.id, contenido: text };
        await this.api.post(API_ENDPOINTS.submissions, body);
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
    const selected = this.selected();
    const existing = selected ? this.activeSubmission(selected) : null;
    if (!existing) {
      return;
    }
    try {
      await this.api.put(`${API_ENDPOINTS.submissions}/${existing.id}/deactivate`, {});
      this.toast.show('Respuesta retirada. Puedes escribir otra.');
      this.close();
      await this.load();
    } catch (e) {
      this.modalError.set(errorMessage(e));
    }
  }
}
