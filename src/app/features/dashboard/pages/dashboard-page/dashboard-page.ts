import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Announcement, Attendance, Course, Enrollment, Grade } from '../../../../core/models/academic.model';
import { Period } from '../../../../core/models/domain-types';
import { ENUM_LABELS, enumLabel } from '../../../../core/models/enums';
import { NavItem } from '../../../../core/models/nav.config';
import { Piar } from '../../../../core/models/piar.model';
import { ChartSeries, DashboardChart, KpiCard } from '../../../../core/models/statistics.model';
import { ApiService } from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth';
import { PermissionsService } from '../../../../core/services/permissions';
import { formatDateTime } from '../../../../core/utils/datatable';
import { errorMessage } from '../../../../core/utils/format';
import { withDisability } from '../../../../core/utils/piar';
import { Alert } from '../../../../shared/components/alert/alert';
import { Card } from '../../../../shared/components/card/card';
import { CHART_COLORS, DashboardChartView } from '../../../../shared/components/dashboard-chart/dashboard-chart';
import { DetailItem, DetailList } from '../../../../shared/components/detail-list/detail-list';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';

/** Datos del colegio con que se arma el tablero (se piden una vez; los filtros se aplican en el navegador). */
interface BoardData {
  courses: Course[];
  enrollments: Enrollment[];
  grades: Grade[];
  attendances: Attendance[];
  piars: Piar[];
}

/** Opción del panel de filtros. */
interface FilterOption {
  value: string;
  label: string;
}

/** Nivel de desempeño (escala de valoración del SIEE, Decreto 1290 de 2009) sobre notas de 0 a 10. */
interface PerformanceLevel {
  label: 'Superior' | 'Alto' | 'Básico' | 'Bajo';
  min: number;
  color: string;
}

const LEVELS: PerformanceLevel[] = [
  { label: 'Superior', min: 9.5, color: '#16a34a' },
  { label: 'Alto', min: 8, color: '#2563eb' },
  { label: 'Básico', min: 6, color: '#d97706' },
  { label: 'Bajo', min: 0, color: '#dc2626' }
];
const PERIODS = Object.keys(ENUM_LABELS['period']) as Period[];
const HIGHLIGHT = '#2563eb';
const DIMMED = '#bfdbfe';
const EMPTY: BoardData = { courses: [], enrollments: [], grades: [], attendances: [], piars: [] };

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

// Panel de inicio. Para administración, rectoría y coordinación (módulo Dashboard con alcance ALL) es un
// TABLERO: 4 indicadores, 6 gráficos y un panel de filtros (curso y periodo) que recalcula todo.
// Los demás roles ven su bienvenida y sus accesos rápidos.
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, Alert, Card, DashboardChartView, DetailList, EmptyState, LoadingState],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css'
})
export class DashboardPage implements OnInit {

  private auth = inject(AuthService);
  private api = inject(ApiService);
  private permissions = inject(PermissionsService);

  readonly role = this.auth.role;
  readonly email = this.auth.email;

  // El tablero se muestra cuando el módulo Dashboard del rol tiene alcance ALL (tabla role_modules)
  readonly canSeeStats = computed(() => this.permissions.find('/dashboard')?.alcance === 'ALL');

  // Módulos del rol (de la base de datos) como accesos rápidos
  readonly features = computed<NavItem[]>(() => this.permissions.navItems().filter(item => item.key !== '/dashboard'));

  readonly announcements = signal<Announcement[]>([]);
  readonly canSeeAnnouncements = computed(() => this.permissions.can('/announcements'));

  readonly account = computed<DetailItem[]>(() => [
    { label: 'Correo', value: this.email() },
    { label: 'Rol', value: enumLabel('role', this.role()) }
  ]);

  // ---------- Datos y filtros del tablero ----------

  readonly data = signal<BoardData>(EMPTY);
  readonly loading = signal(false);
  readonly error = signal('');

  /** Filtro: id del curso ('' = todos) y periodo ('' = todos; aplica a las notas). */
  readonly course = signal('');
  readonly period = signal<Period | ''>('');

  readonly courseOptions = computed<FilterOption[]>(() =>
    [{ value: '', label: 'Todos los cursos' }, ...this.data().courses.map(c => ({ value: String(c.id), label: c.name }))]);
  readonly periodOptions: FilterOption[] = [
    { value: '', label: 'Todos' }, ...PERIODS.map(p => ({ value: p, label: enumLabel('period', p).replace('Periodo ', 'P') }))
  ];

  private readonly courseName = computed(() => this.data().courses.find(c => String(c.id) === this.course())?.name ?? '');

  /** Texto del filtro activo (se muestra bajo el título). */
  readonly filterText = computed(() => {
    const parts = [this.courseName() || 'Todos los cursos'];
    parts.push(this.period() ? enumLabel('period', this.period()) : 'todos los periodos');
    return parts.join(' · ');
  });

  // Registros que quedan después de aplicar el filtro
  private readonly enrollments = computed(() => this.data().enrollments
    .filter(e => e.status === 'ACTIVE' && (!this.course() || String(e.courseId) === this.course())));
  private readonly gradesByCourse = computed(() => this.data().grades
    .filter(g => !this.courseName() || g.courseName === this.courseName()));
  private readonly grades = computed(() => this.gradesByCourse()
    .filter(g => !this.period() || g.period === this.period()));
  private readonly attendances = computed(() => this.data().attendances
    .filter(a => !this.courseName() || a.courseName === this.courseName()));
  private readonly piars = computed(() => withDisability(this.data().piars)
    .filter(p => p.estado !== false && (!this.course() || String(p.courseId) === this.course())));

  /** Promedio de cada estudiante (con las notas filtradas). */
  private readonly studentAverages = computed(() => {
    const byStudent = new Map<number, number[]>();
    this.grades().forEach(g => byStudent.set(g.studentId, [...(byStudent.get(g.studentId) ?? []), Number(g.value)]));
    return [...byStudent.values()].map(average);
  });

  // ---------- 4 indicadores ----------

  readonly kpis = computed<KpiCard[]>(() => {
    const students = this.enrollments().length;
    const grades = this.grades().map(g => Number(g.value));
    const atRisk = this.studentAverages().filter(a => a < 6).length;
    const att = this.attendances();
    const attended = att.filter(a => a.status !== 'ABSENT').length;
    const absences = att.length - attended;
    const piars = this.piars().length;
    return [
      { label: 'Estudiantes matriculados', value: String(students), tone: 'blue',
        hint: this.course() ? this.courseName() : `en ${this.data().courses.length} cursos` },
      { label: 'Promedio general', value: grades.length ? round1(average(grades)).toFixed(1) : '—', tone: 'green',
        hint: `${atRisk} en riesgo (promedio menor a 6)` },
      { label: 'Asistencia', value: att.length ? `${round1((attended / att.length) * 100)}%` : '—', tone: 'amber',
        hint: `${absences} ausencias en ${att.length} registros` },
      { label: 'Estudiantes con PIAR', value: String(piars), tone: 'violet',
        hint: students ? `${round1((piars / students) * 100)}% de los estudiantes` : 'sin estudiantes' }
    ];
  });

  // ---------- 6 gráficos ----------

  readonly charts = computed<DashboardChart[]>(() => [
    this.studentsByCourse(), this.averageBySubject(), this.averageByPeriod(),
    this.attendanceByStatus(), this.performance(), this.piarByDisability()
  ]);

  /** 1. Estudiantes por curso (todos los cursos; el filtrado se resalta). */
  private studentsByCourse(): DashboardChart {
    const active = this.data().enrollments.filter(e => e.status === 'ACTIVE');
    const courses = this.data().courses;
    const series: ChartSeries = {
      labels: courses.map(c => c.name),
      values: courses.map(c => active.filter(e => e.courseId === c.id).length),
      colors: courses.map(c => (!this.course() || String(c.id) === this.course() ? HIGHLIGHT : DIMMED))
    };
    return { title: 'Estudiantes por curso', subtitle: 'Matrículas activas', type: 'bar', data: series };
  }

  /** 2. Promedio por materia. */
  private averageBySubject(): DashboardChart {
    const bySubject = new Map<string, number[]>();
    this.grades().forEach(g => bySubject.set(g.subjectName, [...(bySubject.get(g.subjectName) ?? []), Number(g.value)]));
    const list = [...bySubject].map(([label, v]) => ({ label, value: round1(average(v)) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return {
      title: 'Promedio por materia', subtitle: 'Escala de 0 a 10', type: 'bar', max: 10,
      data: { labels: list.map(x => x.label), values: list.map(x => x.value), colors: list.map(x => (x.value < 6 ? '#dc2626' : HIGHLIGHT)) }
    };
  }

  /** 3. Promedio por periodo (muestra los 4 periodos; el filtro de periodo no lo recorta). */
  private averageByPeriod(): DashboardChart {
    const withGrades = PERIODS.filter(p => this.gradesByCourse().some(g => g.period === p));
    return {
      title: 'Promedio por periodo', subtitle: 'Evolución del año escolar', type: 'line', max: 10,
      data: {
        labels: withGrades.map(p => enumLabel('period', p)),
        values: withGrades.map(p => round1(average(this.gradesByCourse().filter(g => g.period === p).map(g => Number(g.value)))))
      }
    };
  }

  /** 4. Asistencia por estado. */
  private attendanceByStatus(): DashboardChart {
    const states = Object.keys(ENUM_LABELS['attendanceStatus']);
    return {
      title: 'Asistencia por estado', subtitle: 'Registros de clase', type: 'donut',
      data: {
        labels: states.map(s => enumLabel('attendanceStatus', s)),
        values: states.map(s => this.attendances().filter(a => a.status === s).length),
        colors: states.map(s => (s === 'PRESENT' ? '#16a34a' : s === 'ABSENT' ? '#dc2626' : '#d97706'))
      }
    };
  }

  /** 5. Nivel de desempeño de los estudiantes (según su promedio). */
  private performance(): DashboardChart {
    const avgs = this.studentAverages();
    const levelOf = (a: number) => LEVELS.find(l => a >= l.min) ?? LEVELS[LEVELS.length - 1];
    return {
      title: 'Nivel de desempeño', subtitle: 'Estudiantes según su promedio', type: 'donut',
      data: {
        labels: LEVELS.map(l => l.label),
        values: LEVELS.map(l => avgs.filter(a => levelOf(a) === l).length),
        colors: LEVELS.map(l => l.color)
      }
    };
  }

  /** 6. Estudiantes con PIAR por tipo de discapacidad. */
  private piarByDisability(): DashboardChart {
    const counts = new Map<string, number>();
    this.piars().forEach(p => counts.set(p.disability, (counts.get(p.disability) ?? 0) + 1));
    const list = [...counts].sort((a, b) => b[1] - a[1]);
    return {
      title: 'PIAR por discapacidad', subtitle: 'Estudiantes con plan activo', type: 'hbar',
      data: {
        labels: list.map(([code]) => enumLabel('disability', code)),
        values: list.map(([, n]) => n),
        colors: list.map((_, i) => CHART_COLORS[(i + 4) % CHART_COLORS.length])
      }
    };
  }

  // ---------- Carga ----------

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.permissions.load().catch(() => undefined);
    if (this.canSeeStats()) {
      void this.loadBoard();
    }
    if (this.canSeeAnnouncements()) {
      try {
        const rows = (await this.api.get<Announcement[]>('/announcements')).data ?? [];
        this.announcements.set(rows.filter(a => a.estado !== false).slice(0, 3));
      } catch {
        this.announcements.set([]);
      }
    }
  }

  async loadBoard(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [courses, enrollments, grades, attendances, piars] = await Promise.all([
        this.api.get<Course[]>('/courses'),
        this.api.get<Enrollment[]>('/enrollments'),
        this.api.get<Grade[]>('/grades'),
        this.api.get<Attendance[]>('/attendances'),
        this.api.get<Piar[]>('/piars')
      ]);
      this.data.set({
        courses: (courses.data ?? []).filter(c => c.estado !== false),
        enrollments: enrollments.data ?? [],
        grades: grades.data ?? [],
        attendances: attendances.data ?? [],
        piars: piars.data ?? []
      });
    } catch (e) {
      this.error.set(errorMessage(e));
    }
    this.loading.set(false);
  }

  setCourse(value: string): void {
    this.course.set(value);
  }

  setPeriod(value: string): void {
    this.period.set(value as Period | '');
  }

  clearFilters(): void {
    this.course.set('');
    this.period.set('');
  }

  when(value: unknown): string {
    return formatDateTime(value);
  }
}
