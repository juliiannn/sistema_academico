import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/config';
import { Option } from '../../../../core/models/crud.model';
import { ENUM_LABELS, enumLabel } from '../../../../core/models/enums';
import { CourseSubject } from '../../../../core/models/academic.model';
import { AdjustmentType, Period, ProgressLevel } from '../../../../core/models/domain-types';
import {
  Piar, PiarAdjustment, PiarAdjustmentRequest, PiarGoal, PiarGoalRequest, PiarProgress, PiarProgressRequest,
  PiarProgressUpdateRequest
} from '../../../../core/models/piar.model';
import { ApiService } from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth';
import { AuxApiService } from '../../../../core/services/aux-api';
import { PermissionsService } from '../../../../core/services/permissions';
import { ToastService } from '../../../../core/services/toast';
import { errorMessage } from '../../../../core/utils/format';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';

// Modelos de vista: las entidades de la API (piar.model.ts) con los textos listos para la plantilla
interface GoalView extends Pick<PiarGoal, 'id' | 'descripcion'> {
  subject: string;                    // '' = meta general
}
interface AdjustmentView extends Pick<PiarAdjustment, 'id' | 'tipo' | 'descripcion'> {
  subject: string;
}
interface ProgressView extends Pick<PiarProgress, 'id' | 'period' | 'nivel'> {
  goalId: number;
  observaciones: string;
  teacher: string;
}

/** Editor abierto de un avance: meta + periodo (+ id si ya existía). */
interface ProgressDraft {
  goalId: number;
  period: Period;
  progressId: number | null;
  nivel: ProgressLevel;
  observaciones: string;
}

/** Formulario "Nueva meta" (subject = id de la asignación curso-materia, '' = general). */
interface GoalForm {
  subject: string;
  descripcion: string;
}

/** Formulario "Nuevo ajuste razonable". */
interface AdjustmentForm extends GoalForm {
  tipo: AdjustmentType;
}

/** Confirmación pendiente para quitar una meta o un ajuste. */
interface RemoveRequest {
  kind: 'goal' | 'adjustment';
  id: number;
  text: string;
}

const PERIODS = Object.keys(ENUM_LABELS['period']) as Period[];

// Seguimiento del PIAR (Decreto 1421 de 2017): metas, ajustes razonables por materia y avance por periodo.
// Qué se puede hacer sale de la tabla rol × módulo (/piar):
//   · crear  → agregar metas y ajustes          · eliminar → quitar metas y ajustes
//   · el avance lo registran los DOCENTES (queda firmado por quien lo registra); los demás lo consultan.
// readonly = true (vista del estudiante): solo consulta.
@Component({
  selector: 'app-piar-plan',
  imports: [FormsModule, Alert, Button, ConfirmDialog, EmptyState, LoadingState],
  templateUrl: './piar-plan.html',
  styleUrl: './piar-plan.css'
})
export class PiarPlan implements OnInit {

  readonly piarId = input.required<number>();
  readonly readonly = input(false);
  /** Vista del estudiante: usa GET /piars/me y /piars/me/progress (permiso de "Mi apoyo"). */
  readonly own = input(false);
  /** Avisa a la página los datos del plan (estudiante, curso, necesidades) cada vez que se cargan. */
  readonly loaded = output<Piar>();

  private api = inject(ApiService);
  private aux = inject(AuxApiService);
  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);

  readonly periods = PERIODS;
  readonly periodLabel = (p: string) => enumLabel('period', p);
  readonly levelLabel = (l: string) => enumLabel('progressLevel', l);
  readonly typeLabel = (t: string) => enumLabel('adjustmentType', t);
  readonly levels = Object.keys(ENUM_LABELS['progressLevel']) as ProgressLevel[];
  readonly types: Option[] = Object.entries(ENUM_LABELS['adjustmentType']).map(([value, label]) => ({ value, label }));

  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly loadError = signal('');
  readonly piar = signal<Piar | null>(null);
  readonly goals = signal<GoalView[]>([]);
  readonly adjustments = signal<AdjustmentView[]>([]);
  readonly progress = signal<ProgressView[]>([]);
  readonly subjects = signal<Option[]>([]);   // materias del curso del estudiante (el docente: solo las suyas)
  readonly busy = signal(false);

  // Permisos
  readonly canCreate = computed(() => !this.readonly() && this.permissions.can('/piar', 'crear'));
  readonly canDelete = computed(() => !this.readonly() && this.permissions.can('/piar', 'eliminar'));
  readonly canProgress = computed(() => !this.readonly() && this.auth.role() === 'TEACHER' && this.permissions.can('/piar', 'crear'));

  // Formularios
  newGoal: GoalForm = { subject: '', descripcion: '' };
  newAdjustment: AdjustmentForm = { tipo: 'METHODOLOGICAL', subject: '', descripcion: '' };
  readonly draft = signal<ProgressDraft | null>(null);
  readonly confirm = signal<RemoveRequest | null>(null);

  /** Último avance registrado de cada meta (el del periodo más alto). */
  private latestOf(goalId: number): ProgressView | undefined {
    return this.progress().filter(p => p.goalId === goalId).sort((a, b) => b.period.localeCompare(a.period))[0];
  }

  readonly summary = computed(() => {
    const goals = this.goals();
    const latest = goals.map(g => this.latestOf(g.id)?.nivel);
    return [
      { label: 'Metas', value: goals.length },
      { label: 'Logradas', value: latest.filter(l => l === 'ACHIEVED').length },
      { label: 'En proceso', value: latest.filter(l => l === 'IN_PROGRESS').length },
      { label: 'Ajustes razonables', value: this.adjustments().length }
    ];
  });

  progressOf(goalId: number, period: Period): ProgressView | undefined {
    return this.progress().find(p => p.goalId === goalId && p.period === period);
  }

  notesOf(goalId: number): ProgressView[] {
    return this.progress().filter(p => p.goalId === goalId && p.observaciones)
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    try {
      const id = this.piarId();
      const base = API_ENDPOINTS.piar;
      // Estudiante: GET /piars/me (lista de sus PIAR) · personal: GET /piars/{id}
      const piar = this.own()
        ? ((await this.api.get<Piar[]>(`${base}/me`)).data ?? []).find(p => p.id === id) ?? null
        : (await this.api.get<Piar>(`${base}/${id}`)).data;
      const progress = (await this.api.get<PiarProgress[]>(this.own() ? `${base}/me/progress` : `${base}/${id}/progress`)).data ?? [];
      if (!piar) {
        throw new Error('No se encontró el PIAR.');
      }
      this.piar.set(piar);
      this.loaded.emit(piar);
      this.goals.set(piar.goals.map(g => ({ id: g.id, subject: g.subjectName ?? '', descripcion: g.descripcion })));
      this.adjustments.set(piar.adjustments.map(a => ({
        id: a.id, subject: a.subjectName ?? '', tipo: a.tipo, descripcion: a.descripcion
      })));
      this.progress.set(progress.map(p => ({
        id: p.id, goalId: p.piarGoalId, period: p.period, nivel: p.nivel,
        observaciones: p.observaciones ?? '', teacher: p.teacherName
      })));
      if (this.canCreate() && !this.subjects().length && piar.courseId) {
        await this.loadSubjects(piar.courseId);
      }
      this.state.set('ready');
    } catch (error) {
      this.loadError.set(errorMessage(error));
      this.state.set('error');
    }
  }

  // Materias del curso actual del estudiante (/course-subjects ya viene filtrado para el docente)
  private async loadSubjects(courseId: number): Promise<void> {
    if (!courseId) {
      return;
    }
    try {
      const rows = (await this.api.get<CourseSubject[]>('/course-subjects')).data ?? [];
      this.subjects.set(rows
        .filter(cs => cs.courseId === courseId && cs.estado !== false)
        .map(cs => ({ value: String(cs.id), label: cs.subjectName }))
        .sort((a, b) => a.label.localeCompare(b.label)));
    } catch {
      this.subjects.set([]);
    }
  }

  private student(): string {
    return this.piar()?.studentName ?? '';
  }

  // ===== Metas =====

  async addGoal(): Promise<void> {
    const descripcion = this.newGoal.descripcion.trim();
    if (descripcion.length < 5) {
      this.toast.show('Describe la meta (mínimo 5 caracteres).', 'error');
      return;
    }
    await this.run(async () => {
      const body: PiarGoalRequest = {
        piarId: this.piarId(), courseSubjectId: this.newGoal.subject ? Number(this.newGoal.subject) : null, descripcion
      };
      await this.api.post(`${API_ENDPOINTS.piar}/goals`, body);
      this.newGoal = { subject: '', descripcion: '' };
      this.toast.show('Meta agregada al PIAR.');
      void this.aux.logAudit('CREATE', 'PIAR', `Meta agregada al PIAR de ${this.student()}`);
    });
  }

  // ===== Ajustes razonables =====

  async addAdjustment(): Promise<void> {
    const descripcion = this.newAdjustment.descripcion.trim();
    if (descripcion.length < 5) {
      this.toast.show('Describe el ajuste (mínimo 5 caracteres).', 'error');
      return;
    }
    await this.run(async () => {
      const body: PiarAdjustmentRequest = {
        piarId: this.piarId(), tipo: this.newAdjustment.tipo,
        courseSubjectId: this.newAdjustment.subject ? Number(this.newAdjustment.subject) : null, descripcion
      };
      await this.api.post(`${API_ENDPOINTS.piar}/adjustments`, body);
      this.newAdjustment = { tipo: this.newAdjustment.tipo, subject: '', descripcion: '' };
      this.toast.show('Ajuste razonable agregado.');
      void this.aux.logAudit('CREATE', 'PIAR', `Ajuste razonable agregado al PIAR de ${this.student()}`);
    });
  }

  // ===== Quitar meta o ajuste (desactivación lógica) =====

  askRemove(kind: 'goal' | 'adjustment', id: number, descripcion: string): void {
    const what = kind === 'goal' ? 'la meta' : 'el ajuste';
    this.confirm.set({ kind, id, text: `¿Quitar ${what} "${descripcion}" del PIAR? Su historial se conserva.` });
  }

  async remove(): Promise<void> {
    const c = this.confirm();
    this.confirm.set(null);
    if (!c) {
      return;
    }
    await this.run(async () => {
      const path = c.kind === 'goal' ? 'goals' : 'adjustments';
      await this.api.put(`${API_ENDPOINTS.piar}/${path}/${c.id}/deactivate`, {});
      this.toast.show(c.kind === 'goal' ? 'Meta quitada del PIAR.' : 'Ajuste quitado del PIAR.');
      void this.aux.logAudit('DELETE', 'PIAR', `${c.kind === 'goal' ? 'Meta' : 'Ajuste'} quitado del PIAR de ${this.student()}`);
    });
  }

  // ===== Avance por periodo =====

  openProgress(goalId: number, period: Period): void {
    if (!this.canProgress()) {
      return;
    }
    const current = this.progressOf(goalId, period);
    const open = this.draft();
    if (open && open.goalId === goalId && open.period === period) {
      this.draft.set(null);   // segundo clic en la misma casilla: cierra el editor
      return;
    }
    this.draft.set({
      goalId, period, progressId: current?.id ?? null,
      nivel: current?.nivel ?? 'IN_PROGRESS', observaciones: current?.observaciones ?? ''
    });
  }

  setDraftLevel(nivel: ProgressLevel): void {
    this.draft.update(d => d ? { ...d, nivel } : d);
  }

  setDraftNotes(observaciones: string): void {
    this.draft.update(d => d ? { ...d, observaciones } : d);
  }

  async saveProgress(): Promise<void> {
    const d = this.draft();
    if (!d) {
      return;
    }
    await this.run(async () => {
      const observaciones = d.observaciones.trim() || null;
      if (d.progressId !== null) {
        const body: PiarProgressUpdateRequest = { nivel: d.nivel, observaciones };
        await this.api.put(`${API_ENDPOINTS.piar}/progress/${d.progressId}`, body);
      } else {
        const body: PiarProgressRequest = { piarGoalId: d.goalId, period: d.period, nivel: d.nivel, observaciones };
        await this.api.post(`${API_ENDPOINTS.piar}/progress`, body);
      }
      this.draft.set(null);
      this.toast.show(`Avance del ${this.periodLabel(d.period).toLowerCase()} guardado.`);
      void this.aux.logAudit('UPDATE', 'PIAR', `Avance (${this.periodLabel(d.period)}: ${this.levelLabel(d.nivel)}) en el PIAR de ${this.student()}`);
    });
  }

  /** Ejecuta una acción, muestra el error si falla y recarga el plan. */
  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await action();
      await this.load();
    } catch (error) {
      this.toast.show(errorMessage(error), 'error');
    } finally {
      this.busy.set(false);
    }
  }
}
