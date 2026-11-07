import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { Row } from '../../../../core/models/row.model';
import { API_ENDPOINTS } from '../../../../core/config';
import { ApiService } from '../../../../core/services/api';
import { ToastService } from '../../../../core/services/toast';
import { errorMessage } from '../../../../core/utils/format';
import { Alert } from '../../../../shared/components/alert/alert';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { GradeForm, GradeValue } from '../../../../shared/components/grade-form/grade-form';
import { SubmissionCard } from '../../../../shared/components/submission-card/submission-card';

// Respuestas de los estudiantes a UNA actividad: el docente las lee y responde con nota y retroalimentación
@Component({
  selector: 'app-activity-submissions',
  imports: [Alert, EmptyState, GradeForm, SubmissionCard],
  templateUrl: './activity-submissions.html'
})
export class ActivitySubmissions implements OnInit {

  readonly assignmentId = input.required<number>();
  readonly canGrade = input(false);

  readonly changed = output<void>();

  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly items = signal<Row[]>([]);
  readonly error = signal('');
  readonly savingId = signal<number | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const all = ((await this.api.get(`${API_ENDPOINTS.submissions}/assignment/${this.assignmentId()}`)).data ?? []) as Row[];
      this.items.set(
        all
          .filter(s => s['estado'] !== false)
          .sort((a, b) => String(a['studentName']).localeCompare(String(b['studentName']), 'es'))
      );
      this.error.set('');
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  async grade(item: Row, value: GradeValue): Promise<void> {
    this.savingId.set(item['id']);
    try {
      await this.api.put(`${API_ENDPOINTS.submissions}/${item['id']}/grade`, { nota: value.grade, retroalimentacion: value.feedback });
      this.toast.show(`Nota enviada a ${item['studentName']}`);
      await this.load();
      this.changed.emit();
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.savingId.set(null);
  }
}
