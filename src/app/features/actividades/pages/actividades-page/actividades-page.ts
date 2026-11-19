import { Component, computed, inject, signal } from '@angular/core';
import { Assignment } from '../../../../core/models/academic.model';
import { asEntity } from '../../../../core/models/row.model';
import { TableActionEvent } from '../../../../shared/components/data-table/data-table';
import { AuthService } from '../../../../core/services/auth';
import { PermissionsService } from '../../../../core/services/permissions';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { Modal } from '../../../../shared/components/modal/modal';
import { ACTIVIDADES_CONFIG } from '../../models/actividades.config';
import { ActivitySubmissions } from '../../components/activity-submissions/activity-submissions';
import { StudentActivities } from '../../components/student-activities/student-activities';

// Estudiante: responde cada actividad en un cuadro de texto.
// Docente / coordinación / administración: publican actividades y leen y califican las respuestas.
@Component({
  selector: 'app-actividades-page',
  imports: [CrudManager, Modal, ActivitySubmissions, StudentActivities],
  templateUrl: './actividades-page.html'
})
export class ActividadesPage {

  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);

  readonly config = ACTIVIDADES_CONFIG;
  readonly isStudent = computed(() => this.auth.role() === 'STUDENT');
  // Calificar = permiso editar del módulo Entregas (tabla role_modules)
  readonly canGrade = computed(() => this.permissions.can('/academic/submissions', 'editar'));
  readonly selected = signal<Assignment | null>(null);

  onRowAction(event: TableActionEvent): void {
    if (event.action === 'submissions') {
      this.selected.set(asEntity<Assignment>(event.row));
    }
  }

  close(): void {
    this.selected.set(null);
  }
}
