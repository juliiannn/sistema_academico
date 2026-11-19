import { compareLabels } from '../../../core/utils/grade-order';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ColumnDef, Option } from '../../../core/models/crud.model';
import { ENUM_LABELS, enumLabel } from '../../../core/models/enums';
import { Attendance, AttendanceBulkRequest, CourseSubject, Grade, GradeRequest } from '../../../core/models/academic.model';
import { AttendanceStatus, Period } from '../../../core/models/domain-types';
import { Student } from '../../../core/models/people.model';
import { ApiService } from '../../../core/services/api';
import { AuxApiService } from '../../../core/services/aux-api';
import { PermissionsService } from '../../../core/services/permissions';
import { ToastService } from '../../../core/services/toast';
import { errorMessage } from '../../../core/utils/format';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { Card } from '../card/card';
import { DataTable } from '../data-table/data-table';
import { LoadingState } from '../loading-state/loading-state';
import { PageHeader } from '../page-header/page-header';
import { SelectFilter } from '../select-filter/select-filter';

type SheetMode = 'grades' | 'attendance';

interface SheetRow {
  studentId: number;
  name: string;
  document: string;
  existingId: number | null;   // id de la nota / asistencia ya registrada (null = nueva)
  value: string;               // nota (texto) o estado de asistencia (PRESENT, ABSENT, LATE)
  original: string;
}

/** Fila de la tabla de consulta (directivos). */
interface SheetViewRow {
  name: string;
  document: string;
  shown: string;
}

/** Cifra del resumen del grupo. */
interface SheetStat {
  label: string;
  value: string;
}

// Planilla del curso: se elige CURSO → MATERIA → PERIODO (notas) o FECHA (asistencia) y aparecen
// todos los estudiantes matriculados en ese curso.
//   · Con permiso de crear (docente): registra o corrige la nota / asistencia de todo el grupo y guarda de una vez.
//   · Sin ese permiso (admin, rector, coordinador): consulta la planilla en una tabla (DataTables).
// Los permisos salen de la tabla rol × módulo (input module).
@Component({
  selector: 'app-class-sheet',
  imports: [Card, PageHeader, SelectFilter, Alert, Button, DataTable, LoadingState],
  templateUrl: './class-sheet.html',
  styleUrl: './class-sheet.css'
})
export class ClassSheet implements OnInit {

  readonly mode = input.required<SheetMode>();
  readonly module = input.required<string>();

  private api = inject(ApiService);
  private aux = inject(AuxApiService);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);

  readonly assignments = signal<CourseSubject[]>([]);   // curso + materia (+ docente) que el rol puede ver
  readonly courseId = signal('');
  readonly csId = signal('');
  readonly period = signal<Period>('PERIOD_1');
  readonly date = signal(new Date().toLocaleDateString('en-CA'));   // AAAA-MM-DD local

  readonly rows = signal<SheetRow[]>([]);
  readonly state = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly loadError = signal('');
  readonly saving = signal(false);

  readonly isGrades = computed(() => this.mode() === 'grades');
  readonly editable = computed(() => this.permissions.can(this.module(), 'crear'));
  readonly canEditExisting = computed(() => !this.isGrades() || this.permissions.can(this.module(), 'editar'));

  readonly title = computed(() => this.isGrades() ? 'Notas' : 'Asistencia');
  readonly subtitle = computed(() => {
    const what = this.isGrades() ? 'la materia y el periodo' : 'la materia y la fecha';
    return this.editable()
      ? `Elige el curso, ${what}: aparecen todos tus estudiantes para registrar ${this.isGrades() ? 'las notas (0,0 a 10,0)' : 'la asistencia'} y guardar de una vez.`
      : `Elige el curso, ${what} para consultar la planilla del grupo.`;
  });

  readonly courseOptions = computed<Option[]>(() => {
    const seen = new Map<string, string>();
    this.assignments().forEach(a => seen.set(String(a.courseId), a.courseName));
    return [...seen].map(([value, label]) => ({ value, label }))
      .sort((a, b) => compareLabels(a.label, b.label));
  });

  readonly subjectOptions = computed<Option[]>(() => this.assignments()
    .filter(a => String(a.courseId) === this.courseId())
    .map(a => ({ value: String(a.id), label: this.editable() ? a.subjectName : `${a.subjectName} · ${a.teacherName}` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es')));

  readonly periodOptions: Option[] = Object.entries(ENUM_LABELS['period']).map(([value, label]) => ({ value, label }));
  readonly statusOptions = Object.entries(ENUM_LABELS['attendanceStatus']).map(([value, label]) => ({ value, label }));

  readonly ready = computed(() => !!this.courseId() && !!this.csId() && (this.isGrades() || !!this.date()));
  readonly dirty = computed(() => this.rows().some(r => r.value !== r.original));

  // Resumen del grupo
  readonly summary = computed<SheetStat[]>(() => {
    const rows = this.rows();
    if (this.isGrades()) {
      const values = rows.map(r => Number(r.value.replace(',', '.'))).filter((v, i) => rows[i].value !== '' && !isNaN(v) && v >= 0 && v <= 10);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return [
        { label: 'Estudiantes', value: String(rows.length) },
        { label: 'Con nota', value: String(values.length) },
        { label: 'Promedio', value: avg === null ? '—' : avg.toFixed(1) },
        { label: 'Por debajo de 6,0', value: String(values.filter(v => v < 6).length) }
      ];
    }
    const count = (s: string) => rows.filter(r => r.value === s).length;
    return [
      { label: 'Estudiantes', value: String(rows.length) },
      { label: 'Presentes', value: String(count('PRESENT')) },
      { label: 'Ausentes', value: String(count('ABSENT')) },
      { label: 'Tarde', value: String(count('LATE')) }
    ];
  });

  // Vista de consulta (DataTables)
  readonly viewColumns = computed<ColumnDef[]>(() => [
    { key: 'name', label: 'Estudiante' },
    { key: 'document', label: 'Documento' },
    { key: 'shown', label: this.isGrades() ? 'Nota' : 'Asistencia' }
  ]);
  readonly viewRows = computed<SheetViewRow[]>(() => this.rows().map(r => ({
    name: r.name,
    document: r.document,
    shown: r.value === '' ? 'Sin registrar' : this.isGrades() ? r.value : enumLabel('attendanceStatus', r.value)
  })));

  async ngOnInit(): Promise<void> {
    try {
      // El docente recibe solo sus asignaciones; los directivos, todas las activas
      const data = (await this.api.get<CourseSubject[]>('/course-subjects')).data ?? [];
      this.assignments.set(data.filter(a => a['estado'] !== false));
      if (this.courseOptions().length === 1) {
        this.onCourse(this.courseOptions()[0].value);
      }
    } catch (error) {
      this.loadError.set(errorMessage(error));
      this.state.set('error');
    }
  }

  onCourse(value: string): void {
    this.courseId.set(value);
    this.csId.set('');
    this.rows.set([]);
    this.state.set('idle');
    const subjects = this.subjectOptions();
    if (subjects.length === 1) {
      this.onSubject(subjects[0].value);
    }
  }

  onSubject(value: string): void {
    this.csId.set(value);
    void this.load();
  }

  onPeriod(value: string): void {
    this.period.set((value || 'PERIOD_1') as Period);   // el select entrega el código del periodo
    void this.load();
  }

  onDate(value: string): void {
    this.date.set(value);
    void this.load();
  }

  private async load(): Promise<void> {
    if (!this.ready()) {
      this.rows.set([]);
      this.state.set('idle');
      return;
    }
    this.state.set('loading');
    try {
      const students = (await this.api.get<Student[]>(`/enrollments/course/${this.courseId()}/students`)).data ?? [];
      // Registros ya guardados de ese grupo: notas del periodo o asistencia de la fecha → { estudiante: [id, valor] }
      const existing = new Map<number, [number, string]>();
      if (this.isGrades()) {
        const grades = (await this.api.get<Grade[]>(`/grades/course-subject/${this.csId()}`)).data ?? [];
        grades.filter(g => g.period === this.period()).forEach(g => existing.set(g.studentId, [g.id, String(g.value)]));
      } else {
        const marks = (await this.api.get<Attendance[]>(`/attendances/course-subject/${this.csId()}?date=${this.date()}`)).data ?? [];
        marks.forEach(a => existing.set(a.studentId, [a.id, a.status]));
      }
      this.rows.set(students
        .map<SheetRow>(s => {
          const [existingId, value] = existing.get(s.id) ?? [null, ''];
          return { studentId: s.id, name: s.fullName, document: s.document ?? '', existingId, value, original: value };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es')));
      this.state.set('ready');
    } catch (error) {
      this.loadError.set(errorMessage(error));
      this.state.set('error');
    }
  }

  setValue(index: number, value: string): void {
    if (this.isGrades()) {
      value = value.replace(/[^0-9.,]/g, '');
    }
    this.rows.update(rows => rows.map((r, i) => i === index ? { ...r, value } : r));
  }

  markAll(status: string): void {
    this.rows.update(rows => rows.map(r => ({ ...r, value: status })));
  }

  invalidGrade(value: string): boolean {
    if (value === '') {
      return false;
    }
    const n = Number(value.replace(',', '.'));
    return isNaN(n) || n < 0 || n > 10;
  }

  async save(): Promise<void> {
    if (this.saving() || !this.dirty()) {
      return;
    }
    this.saving.set(true);
    try {
      if (this.isGrades()) {
        await this.saveGrades();
      } else {
        await this.saveAttendance();
      }
    } finally {
      this.saving.set(false);
    }
  }

  private context(): string {
    const cs = this.assignments().find(a => String(a['id']) === this.csId());
    const when = this.isGrades() ? enumLabel('period', this.period()) : this.date();
    return `${cs?.['courseName']} · ${cs?.['subjectName']} · ${when}`;
  }

  private async saveGrades(): Promise<void> {
    const changed = this.rows().filter(r => r.value !== r.original && r.value !== '');
    const bad = changed.filter(r => this.invalidGrade(r.value));
    if (bad.length) {
      this.toast.show(`Revisa la nota de ${bad[0].name}: debe estar entre 0,0 y 10,0.`, 'error');
      return;
    }
    let ok = 0;
    const errors: string[] = [];
    for (const r of changed) {
      const value = Number(r.value.replace(',', '.'));
      try {
        if (r.existingId !== null) {
          const body: GradeRequest = { value };
          await this.api.put(`/grades/${r.existingId}`, body);
        } else {
          const body: GradeRequest = { studentId: r.studentId, courseSubjectId: Number(this.csId()), period: this.period(), value };
          await this.api.post('/grades', body);
        }
        ok++;
      } catch (error) {
        errors.push(`${r.name}: ${errorMessage(error)}`);
      }
    }
    this.report(ok, errors, 'nota(s)');
    void this.aux.logAudit('UPDATE', 'Notas', `Planilla ${this.context()}: ${ok} nota(s) guardada(s)`);
    await this.load();
  }

  private async saveAttendance(): Promise<void> {
    const records = this.rows().filter(r => r.value !== '').map(r => ({ studentId: r.studentId, status: r.value as AttendanceStatus }));
    if (!records.length) {
      this.toast.show('Marca la asistencia de al menos un estudiante.', 'error');
      return;
    }
    try {
      const body: AttendanceBulkRequest = { courseSubjectId: Number(this.csId()), date: this.date(), records };
      await this.api.post('/attendances/bulk', body);
      this.report(records.length, [], 'registro(s) de asistencia');
      void this.aux.logAudit('CREATE', 'Asistencia', `Planilla ${this.context()}: ${records.length} registro(s)`);
    } catch (error) {
      this.report(0, [errorMessage(error)], 'registro(s) de asistencia');
    }
    await this.load();
  }

  private report(ok: number, errors: string[], what: string): void {
    if (errors.length) {
      this.toast.show(`Se guardaron ${ok} ${what}. No se pudo guardar: ${errors.slice(0, 2).join(' · ')}`, 'error');
    } else {
      this.toast.show(`Se guardaron ${ok} ${what}.`, 'success');
    }
  }
}
