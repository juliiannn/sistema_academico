import { Injectable, inject } from '@angular/core';
import { API_ENDPOINTS } from '../config';
import { PermissionsService } from './permissions';
import { withDisability } from '../utils/piar';
import { AiSettingsService } from './ai-settings';
import { AuthService } from './auth';
import { AuxApiService } from './aux-api';
import { ApiService } from './api';
import { ChatTurn, OllamaService } from './ollama';
import { ColumnDef } from '../models/crud.model';
import { enumLabel } from '../models/enums';
import {
  Assignment, Attendance, Course, CourseSubject, Enrollment, Grade, Schedule, Submission, Subject
} from '../models/academic.model';
import { AttendanceStatus } from '../models/domain-types';
import { AnyProfile, Coordinator, Rector, Student, Teacher, User } from '../models/people.model';
import { Piar, PiarWithDisability } from '../models/piar.model';
import {
  Intent, detectDay, detectDisability, detectIntent, detectPeriod, findByName, findCourse,
  findPersonByName, normalize, refersToPrevious
} from '../utils/assistant-nlu';

export interface AssistantReply {
  text: string;
  columns?: ColumnDef[];
  rows?: readonly object[];   // filas de la tabla de la respuesta (cualquier entidad: Grade, Student...)
  query: string;        // consulta que se ejecutó (transparencia)
}

/** Datos que el asistente consulta (solo lectura), ya filtrados por el alcance del rol. */
interface AssistantData {
  students: Student[];
  teachers: Teacher[];
  coordinators: Coordinator[];
  rectors: Rector[];
  users: User[];
  courses: Course[];
  subjects: Subject[];
  courseSubjects: CourseSubject[];
  enrollments: Enrollment[];
  grades: Grade[];
  attendances: Attendance[];
  assignments: Assignment[];
  submissions: Submission[];
  schedules: Schedule[];
  piars: PiarWithDisability[];
}

const EMPTY_DATA: AssistantData = {
  students: [], teachers: [], coordinators: [], rectors: [], users: [], courses: [], subjects: [], courseSubjects: [],
  enrollments: [], grades: [], attendances: [], assignments: [], submissions: [], schedules: [], piars: []
};

/** Resumen de datos que se le entrega a la IA local. */
interface AiContext {
  context: string;    // texto con las secciones (estudiantes, PIAR, promedios...)
  records: number;    // cuántos registros resume
}

/** Fila de la tabla "promedio por materia". */
interface SubjectAverage {
  subjectName: string;
  average: number;
  count: number;
}

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));


const PERSON_COLUMNS: ColumnDef[] = [
  { key: 'fullName', label: 'Nombre' },
  { key: 'document', label: 'Documento' },
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' }
];

// Asistente de consultas en lenguaje natural. SOLO LEE: usa los mismos "endpoints" que las pantallas
// (por eso respeta el alcance de cada rol), no modifica nada y deja cada consulta en la auditoría.
@Injectable({ providedIn: 'root' })
export class AssistantService {

  private main = inject(ApiService);
  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);
  private api = inject(AuxApiService);
  private ai = inject(AiSettingsService);
  private ollama = inject(OllamaService);

  // Últimos turnos de la conversación con la IA local
  private history: ChatTurn[] = [];

  // Contexto de la conversación: a quién/qué se habló por última vez
  private lastPerson: AnyProfile | null = null;
  private lastCourse: Course | null = null;

  // Ejemplos según el rol (el docente ve preguntas sobre SUS cursos)
  private static readonly STAFF_EXAMPLES = [
    '¿Cuántos estudiantes hay?',
    'Estudiantes con discapacidad',
    'Estudiantes con TDAH',
    'Promedio de notas por materia',
    '¿Qué estudiantes están en riesgo académico?',
    'Resumen de asistencia por curso',
    'Actividades próximas',
    'Redacta un comunicado para la reunión de padres'
  ];

  private static readonly TEACHER_EXAMPLES = [
    '¿Qué estudiantes van mal en mi materia?',
    'Resume el desempeño de mis cursos',
    '¿Quiénes han faltado más?',
    'Estudiantes con PIAR en mis cursos',
    'Sugiere ajustes razonables para un estudiante con TDAH',
    'Dame una actividad para reforzar el tema con apoyos visuales',
    'Redacta un mensaje para los acudientes sobre la próxima actividad',
    'Actividades próximas'
  ];

  get examples(): string[] {
    return this.auth.role() === 'TEACHER' ? AssistantService.TEACHER_EXAMPLES : AssistantService.STAFF_EXAMPLES;
  }

  // Acceso según la tabla role_modules (módulo /assistant)
  canUse(): boolean {
    return this.permissions.can('/assistant');
  }

  reset(): void {
    this.lastPerson = null;
    this.lastCourse = null;
    this.history = [];
  }

  /** Motor que responderá la próxima pregunta (para mostrarlo en pantalla). */
  engine(): string {
    const s = this.ai.settings();
    return s.enabled ? `IA local · ${s.model}` : 'Asistente básico (reglas)';
  }

  async ask(question: string): Promise<AssistantReply> {

    if (!this.canUse()) {
      throw new Error('Tu rol no tiene acceso al asistente.');
    }

    const text = question.trim();
    await this.loadSnapshot();
    const intent = detectIntent(text);
    let reply: AssistantReply;

    try {
      reply = this.ai.settings().enabled ? await this.answerWithOllama(text, intent) : await this.answer(intent, text);
    } catch (error) {
      void this.api.logAudit('READ', 'Asistente IA', `Consulta con error: ${text}`.slice(0, 300));
      throw error;
    }

    void this.api.logAudit('READ', 'Asistente IA', `Consulta: ${text} → ${reply.query}`.slice(0, 1000));
    return reply;
  }

  // ---------- IA local (Ollama) ----------

  // Si la IA local falla, se responde con el asistente básico y se avisa en el mismo mensaje
  private async answerWithOllama(question: string, intent: Intent): Promise<AssistantReply> {

    const { context, records } = this.buildContext();

    // La IA GENERA sus respuestas: analiza, explica, recomienda y redacta textos nuevos.
    // Las cifras y nombres sí deben salir de los datos reales del colegio (para no inventar notas ni estudiantes).
    const system =
      'Eres el asistente pedagógico e institucional de un colegio en Colombia (preescolar, básica primaria, básica secundaria y media). Respondes en español, ' +
      'con un tono cercano y profesional, y en el formato que mejor sirva (párrafos cortos, listas o pasos).\n' +
      'Puedes GENERAR contenido propio: analizar el rendimiento y la asistencia, detectar estudiantes en riesgo, ' +
      'proponer estrategias de refuerzo y ajustes razonables para el PIAR (Decreto 1421 de 2017), redactar ' +
      'comunicados, mensajes para acudientes, retroalimentación para estudiantes, ideas de actividades y planes de clase, ' +
      'y explicar temas según el grado del estudiante.\n' +
      'Reglas: cuando hables de datos concretos del colegio (nombres, notas, asistencia, cursos, cantidades) usa SOLO ' +
      'los DATOS de abajo y no inventes cifras ni personas; si un dato no está, dilo. Las recomendaciones, explicaciones ' +
      'y textos redactados sí son tuyos. No digas que guardaste o modificaste información: tú propones y la persona decide. ' +
      'Escala de notas: 0 a 10 (menos de 6 es desempeño bajo).\n' +
      `Rol de quien pregunta: ${enumLabel('role', this.auth.role())}.\n\nDATOS DEL COLEGIO:\n${context}`;

    const turns: ChatTurn[] = [{ role: 'system', content: system }, ...this.history.slice(-6), { role: 'user', content: question }];

    try {
      const answer = await this.ollama.chat(turns);
      const next: ChatTurn[] = [{ role: 'user', content: question }, { role: 'assistant', content: answer }];
      this.history = [...this.history, ...next].slice(-8);
      return { text: answer, query: `${this.engine()} · respuesta generada con ${records} registros del colegio` };
    } catch (error) {
      const fallback = await this.answer(intent, question);
      return { ...fallback, text: `${fallback.text}\n\n(No pude usar la IA local: ${errorText(error)} Respondí con el asistente básico.)` };
    }
  }

  // Resumen de datos para la IA, ya filtrado por el rol. Las notas y la asistencia NO se envían fila por fila
  // (serían miles): se resumen por estudiante, para que la IA vea a TODO el colegio dentro de su contexto.
  private buildContext(): AiContext {
    const lines: string[] = [];
    const add = (title: string, rows: string[], max = 400) => { lines.push(`## ${title} (${rows.length})`, ...rows.slice(0, max)); };
    const round = (n: number) => Math.round(n * 10) / 10;

    const enrollments = this.data.enrollments;
    const piar = this.data.piars.filter(r => r.estado !== false);
    const courseOf = (id: unknown) => enrollments.find(e => e.studentId === id && e.status === 'ACTIVE')?.['courseName'] ?? 'sin curso';
    const piarOf = (id: unknown) => {
      const r = piar.find(x => x.studentId === id);
      return r ? `PIAR: ${enumLabel('disability', r.disability)}` : 'sin PIAR';
    };

    // Notas → promedio por estudiante y materias con promedio bajo
    const grades = this.data.grades;
    const bySubject = new Map<unknown, Map<string, number[]>>();
    grades.forEach(g => {
      const m = bySubject.get(g.studentId) ?? new Map<string, number[]>();
      const list = m.get(String(g.subjectName)) ?? [];
      list.push(Number(g.value));
      m.set(String(g.subjectName), list);
      bySubject.set(g.studentId, m);
    });
    // Asistencia → faltas y llegadas tarde por estudiante
    const absences = new Map<unknown, { abs: number; late: number; total: number }>();
    this.data.attendances.forEach(a => {
      const x = absences.get(a.studentId) ?? { abs: 0, late: 0, total: 0 };
      x.total++;
      if (a.status === 'ABSENT') x.abs++;
      if (a.status === 'LATE') x.late++;
      absences.set(a.studentId, x);
    });

    const studentLines = this.data.students.map(s => {
      const subj = bySubject.get(s.id);
      const avgs = subj ? [...subj].map(([name, v]) => [name, v.reduce((p, c) => p + c, 0) / v.length] as [string, number]) : [];
      const general = avgs.length ? round(avgs.reduce((p, [, v]) => p + v, 0) / avgs.length) : null;
      const low = avgs.filter(([, v]) => v < 6).map(([n, v]) => `${n} ${round(v)}`);
      const att = absences.get(s.id);
      const attText = att ? `${att.abs} faltas, ${att.late} tardes de ${att.total} clases` : 'sin asistencia registrada';
      const piarText = piarOf(s.id);
      return `${s.fullName} | ${courseOf(s.id)} | ${general ?? 'sin notas'} | ${low.length ? low.join(', ') : '-'} | ${attText}` +
        (piarText === 'sin PIAR' ? '' : ` | ${piarText}`);
    });
    add('Estudiantes (nombre | curso | promedio general | materias con promedio menor a 6 | asistencia | PIAR si tiene)', studentLines);
    // Lo más importante va primero: si el contexto se recorta, se pierde lo del final
    add('PIAR activos (estudiante | discapacidad | observaciones)', piar.map(r => `${r.studentName} | ${enumLabel('disability', r.disability)} | ${r.observaciones ?? ''}`));

    // Promedio por curso y materia (para comparar grupos)
    const csAvg = new Map<string, number[]>();
    grades.forEach(g => {
      const key = `${g.courseName ?? ''} | ${g.subjectName}`;
      csAvg.set(key, [...(csAvg.get(key) ?? []), Number(g.value)]);
    });
    add('Promedio por curso y materia', [...csAvg].map(([k, v]) => `${k} | ${round(v.reduce((p, c) => p + c, 0) / v.length)}`));

    // Docentes con sus materias y cursos (más corto que una fila por asignación)
    const load = new Map<string, string[]>();
    this.data.courseSubjects.forEach(c => {
      const key = String(c.teacherName);
      load.set(key, [...(load.get(key) ?? []), `${c.subjectName} ${c.courseName}`]);
    });
    add('Docentes (docente | materias y cursos que dicta)', [...load].map(([t, list]) => `${t} | ${list.join(', ')}`));
    add('Cursos (curso | director de grupo)', this.data.courses.map(c => `${c.name} | ${c.directorTeacherName ?? 'sin director'}`));

    const today = new Date().toLocaleDateString('en-CA');
    add('Actividades próximas (título | curso | materia | fecha de entrega)',
      this.data.assignments.filter(a => String(a.dueDate) >= today)
        .sort((x, y) => String(x.dueDate).localeCompare(String(y.dueDate)))
        .map(a => `${a.title} | ${a.courseName} | ${a.subjectName} | ${a.dueDate}`), 40);
    const subs = this.data.submissions;
    if (subs.length) {
      add('Entregas pendientes de calificar (estudiante | actividad)',
        subs.filter(e => e.nota === null || e.nota === undefined).map(e => `${e.studentName} | ${e.assignmentTitle}`), 40);
    }

    const context = lines.join('\n').slice(0, 30000);
    return { context, records: grades.length + this.data.attendances.length + studentLines.length };
  }

  // ---------- acceso a datos (solo GET) ----------

  // Foto de los datos que el rol actual puede consultar. Se pide al backend al inicio de cada pregunta
  // (solo GET) y las respuestas se arman sobre ella.
  private data: AssistantData = EMPTY_DATA;
  private dataAt = 0;
  private dataToken = '';

  /** Pide un listado; si el rol no tiene permiso, el asistente simplemente no lo ve (lista vacía). */
  private async fetchList<T>(endpoint: string): Promise<T[]> {
    try {
      const data = (await this.main.get<T[]>(endpoint)).data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private async loadSnapshot(): Promise<void> {
    // Los datos se reutilizan 2 minutos entre preguntas (antes se pedían todos los listados en cada pregunta)
    if (this.dataAt && this.dataToken === this.auth.token() && Date.now() - this.dataAt < 120_000) {
      return;
    }
    // Solo los listados que el rol puede consultar (el docente recibe únicamente lo de sus cursos)
    const teacher = this.auth.role() === 'TEACHER';
    const [students, teachers, coordinators, rectors, users, courses, subjects, courseSubjects, enrollments,
      grades, attendances, assignments, submissions, schedules, piars] = await Promise.all([
      this.fetchList<Student>('/students'),
      teacher ? Promise.resolve<Teacher[]>([]) : this.fetchList<Teacher>('/teachers'),
      teacher ? Promise.resolve<Coordinator[]>([]) : this.fetchList<Coordinator>('/coordinators'),
      teacher ? Promise.resolve<Rector[]>([]) : this.fetchList<Rector>('/rectors'),
      teacher ? Promise.resolve<User[]>([]) : this.fetchList<User>('/users'),
      this.fetchList<Course>('/courses'),
      this.fetchList<Subject>('/subjects'),
      this.fetchList<CourseSubject>('/course-subjects'),
      teacher ? Promise.resolve<Enrollment[]>([]) : this.fetchList<Enrollment>('/enrollments'),
      this.fetchList<Grade>('/grades'),
      this.fetchList<Attendance>('/attendances'),
      this.fetchList<Assignment>('/assignments'),
      teacher ? this.fetchList<Submission>(API_ENDPOINTS.submissions) : Promise.resolve<Submission[]>([]),
      this.fetchList<Schedule>('/schedules'),
      this.fetchList<Piar>(API_ENDPOINTS.piar)
    ]);
    this.data = {
      students, teachers, coordinators, rectors, users, courses, subjects, courseSubjects, enrollments,
      grades, attendances, assignments, submissions, schedules, piars: withDisability(piars)
    };

    // El docente no lista matrículas: se arman con los estudiantes de cada uno de sus cursos
    if (teacher) {
      const lists = await Promise.all(courses.map(async course => {
        const list = await this.fetchList<Student>(`/enrollments/course/${course.id}/students`);
        return list.map<Enrollment>(st => ({
          id: 0, studentId: st.id, studentName: st.fullName, courseId: course.id, courseName: course.name,
          enrollmentDate: '', status: 'ACTIVE'
        }));
      }));
      this.data.enrollments = lists.flat();
    }
    this.dataAt = Date.now();
    this.dataToken = this.auth.token() ?? '';
  }

  private people(): AnyProfile[] {
    const d = this.data;
    return [...d.students, ...d.teachers, ...d.coordinators, ...d.rectors];
  }

  private resolvePerson<T extends AnyProfile>(question: string, pool: T[]): T | null {
    const found = findPersonByName(question, pool);
    if (found) {
      this.lastPerson = found;
      return found;
    }
    const last = this.lastPerson;
    // "¿y sus notas?": la persona de la pregunta anterior, si está en este grupo
    return refersToPrevious(question) && last ? pool.find(p => p.id === last.id) ?? null : null;
  }

  private resolveCourse(question: string): Course | null {
    const found = findCourse(question, this.data.courses);
    if (found) {
      this.lastCourse = found;
      return found;
    }
    return refersToPrevious(question) ? this.lastCourse : null;
  }

  // ---------- respuestas por intención ----------

  private async answer(intent: Intent, q: string): Promise<AssistantReply> {
    switch (intent) {
      case 'help': return this.help();
      case 'piar': return this.piar(q);
      case 'supports': return this.supports(q);
      case 'grades': return this.grades(q);
      case 'attendance': return this.attendance(q);
      case 'schedule': return this.schedule(q);
      case 'assignments': return this.assignments(q);
      case 'enrollments': return this.enrollments(q);
      case 'teaching': return this.teaching(q);
      case 'entities': return this.entities(q);
      default:
        return {
          text: 'No entendí la pregunta. Prueba con alguno de los ejemplos: pregunta por estudiantes, docentes, cursos, notas, ' +
            'asistencia, horarios, actividades, matrículas, PIAR o apoyos visuales.',
          query: 'sin consulta'
        };
    }
  }

  private help(): AssistantReply {
    return {
      text: 'Puedo consultar (solo lectura): personas y cursos, matrículas, notas y promedios, asistencia, horarios, actividades, ' +
        'asignación de materias, estudiantes con PIAR por discapacidad y apoyos visuales. Menciona nombres, cursos (10-A) o periodos.',
      query: 'ayuda'
    };
  }

  private piar(q: string): AssistantReply {
    const code = detectDisability(q);
    const endpoint = API_ENDPOINTS.piar;
    const rows = this.data.piars.filter(r => r.estado !== false && (!code || r.disability === code));
    const label = code ? enumLabel('disability', code) : 'todas las discapacidades';

    return {
      text: rows.length
        ? `Hay ${rows.length} estudiante(s) con PIAR activo (${label}).`
        : `No hay estudiantes con PIAR activo para: ${label}.`,
      columns: [
        { key: 'studentName', label: 'Estudiante' },
        { key: 'schoolYear', label: 'Año escolar' },
        { key: 'disability', label: 'Discapacidad', kind: 'enum', enumKey: 'disability' },
        { key: 'observaciones', label: 'Observaciones' },
        { key: 'creado', label: 'Fecha', kind: 'datetime' }
      ],
      rows,
      query: `GET ${endpoint} (solo activos${code ? ', ' + enumLabel('disability', code) : ''})`
    };
  }

  private async supports(q: string): Promise<AssistantReply> {
    const person = this.resolvePerson(q, this.data.students);
    const email = person ? String(person.email) : undefined;
    const items = await this.api.listAllSupports(email ? { estudiante_email: email } : {});
    const rows = items.filter(s => s.estado).map(s => ({ ...s, studentName: this.nameOfEmail(s.estudiante_email) }));

    return {
      text: person
        ? `${rows.length} apoyo(s) visual(es) activo(s) de ${person.fullName}.`
        : `${rows.length} apoyo(s) visual(es) activo(s) en total.`,
      columns: [
        { key: 'titulo', label: 'Título' },
        { key: 'tipo', label: 'Tipo', kind: 'enum', enumKey: 'supportType' },
        { key: 'studentName', label: 'Estudiante' },
        { key: 'total_pasos', label: 'Pasos' }
      ],
      rows,
      query: `API auxiliar: GET /supports${email ? '?estudiante_email=…' : ''}`
    };
  }

  private nameOfEmail(email: string | null): string {
    if (!email) {
      return 'Todo el aula';
    }
    const person = this.people().find(p => String(p.email).toLowerCase() === email.toLowerCase());
    return person ? String(person.fullName) : email;
  }

  private grades(q: string): AssistantReply {
    const period = detectPeriod(q);
    const person = this.resolvePerson(q, this.data.students);
    const subject = findByName(q, this.data.subjects);
    const course = person ? null : this.resolveCourse(q);
    const wantsAverage = /promedio|rendimiento|desempeno/.test(normalize(q));

    let grades = this.data.grades;
    const filters: string[] = [];

    if (person) { grades = grades.filter(g => g.studentId === person.id); filters.push(`estudiante «${person.fullName}»`); }
    if (course) { grades = grades.filter(g => g.courseName === course.name); filters.push(`curso ${course.name}`); }
    if (subject) { grades = grades.filter(g => g.subjectName === subject.name); filters.push(`materia ${subject.name}`); }
    if (period) { grades = grades.filter(g => g.period === period); filters.push(enumLabel('period', period)); }

    const query = `GET /grades${filters.length ? ' · filtro: ' + filters.join(', ') : ''}`;

    if (grades.length === 0) {
      return { text: 'No encontré notas con esos filtros.', query };
    }

    const avg = (list: Grade[]) => Math.round((list.reduce((s, g) => s + Number(g.value), 0) / list.length) * 100) / 100;

    if (wantsAverage && !person) {
      const bySubject = new Map<string, Grade[]>();
      grades.forEach(g => bySubject.set(g.subjectName, [...(bySubject.get(g.subjectName) ?? []), g]));
      const rows: SubjectAverage[] = [...bySubject.entries()].map(([name, list]) => ({ subjectName: name, average: avg(list), count: list.length }));
      return {
        text: `Promedio general: ${avg(grades)} (escala 0 a 10) sobre ${grades.length} nota(s).`,
        columns: [
          { key: 'subjectName', label: 'Materia' },
          { key: 'average', label: 'Promedio' },
          { key: 'count', label: 'Notas registradas' }
        ],
        rows,
        query
      };
    }

    return {
      text: person
        ? `${person.fullName}: ${grades.length} nota(s), promedio ${avg(grades)}.`
        : `${grades.length} nota(s) encontradas, promedio ${avg(grades)}.`,
      columns: [
        { key: 'studentName', label: 'Estudiante' },
        { key: 'courseName', label: 'Curso' },
        { key: 'subjectName', label: 'Materia' },
        { key: 'period', label: 'Periodo', kind: 'enum', enumKey: 'period' },
        { key: 'value', label: 'Nota' }
      ],
      rows: grades,
      query
    };
  }

  private attendance(q: string): AssistantReply {
    const nq = normalize(q);
    const person = this.resolvePerson(q, this.data.students);
    const course = person ? null : this.resolveCourse(q);

    let status: AttendanceStatus | null = null;
    if (/ausen|inasistencia|falta/.test(nq)) { status = 'ABSENT'; }
    else if (/tarde|tardanza/.test(nq)) { status = 'LATE'; }

    let records = this.data.attendances;
    const filters: string[] = [];

    if (person) { records = records.filter(r => r.studentId === person.id); filters.push(`estudiante «${person.fullName}»`); }
    if (course) { records = records.filter(r => r.courseName === course.name); filters.push(`curso ${course.name}`); }
    if (status) { records = records.filter(r => r.status === status); filters.push(enumLabel('attendanceStatus', status)); }

    const query = `GET /attendances${filters.length ? ' · filtro: ' + filters.join(', ') : ''}`;

    return {
      text: records.length ? `${records.length} registro(s) de asistencia encontrados.` : 'No encontré registros de asistencia con esos filtros.',
      columns: [
        { key: 'studentName', label: 'Estudiante' },
        { key: 'courseName', label: 'Curso' },
        { key: 'subjectName', label: 'Materia' },
        { key: 'date', label: 'Fecha' },
        { key: 'status', label: 'Estado', kind: 'enum', enumKey: 'attendanceStatus' }
      ],
      rows: records,
      query
    };
  }

  private schedule(q: string): AssistantReply {
    const course = this.resolveCourse(q);
    const day = detectDay(q);
    const teacher = findPersonByName(q, this.data.teachers);

    let rows = this.data.schedules;
    const filters: string[] = [];

    if (course) { rows = rows.filter(r => r.courseName === course.name); filters.push(`curso ${course.name}`); }
    if (day) { rows = rows.filter(r => r.dayOfWeek === day); filters.push(enumLabel('dayOfWeek', day)); }
    if (teacher) {
      const mine = this.data.courseSubjects.filter(cs => cs.teacherId === teacher.id).map(cs => cs.id);
      rows = rows.filter(r => mine.includes(r.courseSubjectId));
      filters.push(`docente «${teacher.fullName}»`);
    }

    return {
      text: rows.length ? `${rows.length} bloque(s) de horario.` : 'No encontré horarios con esos filtros.',
      columns: [
        { key: 'courseName', label: 'Curso' },
        { key: 'subjectName', label: 'Materia' },
        { key: 'dayOfWeek', label: 'Día', kind: 'enum', enumKey: 'dayOfWeek' },
        { key: 'startTime', label: 'Inicio' },
        { key: 'endTime', label: 'Fin' }
      ],
      rows,
      query: `GET /schedules${filters.length ? ' · filtro: ' + filters.join(', ') : ''}`
    };
  }

  private assignments(q: string): AssistantReply {
    const course = this.resolveCourse(q);
    const upcoming = /proxim|pendiente|vigente|por entregar/.test(normalize(q));
    const today = new Date().toISOString().slice(0, 10);

    let rows = this.data.assignments;
    const filters: string[] = [];

    if (course) { rows = rows.filter(r => r.courseName === course.name); filters.push(`curso ${course.name}`); }
    if (upcoming) { rows = rows.filter(r => String(r.dueDate) >= today); filters.push(`entrega desde ${today}`); }

    rows = [...rows].sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

    return {
      text: rows.length ? `${rows.length} actividad(es).` : 'No hay actividades con esos filtros.',
      columns: [
        { key: 'title', label: 'Actividad' },
        { key: 'courseName', label: 'Curso' },
        { key: 'subjectName', label: 'Materia' },
        { key: 'dueDate', label: 'Entrega' }
      ],
      rows,
      query: `GET /assignments${filters.length ? ' · filtro: ' + filters.join(', ') : ''}`
    };
  }

  private enrollments(q: string): AssistantReply {
    const course = this.resolveCourse(q);
    const person = course ? null : this.resolvePerson(q, this.data.students);

    let rows = this.data.enrollments;
    const filters: string[] = [];

    if (course) { rows = rows.filter(r => r.courseName === course.name); filters.push(`curso ${course.name}`); }
    if (person) { rows = rows.filter(r => r.studentId === person.id); filters.push(`estudiante «${person.fullName}»`); }

    return {
      text: rows.length ? `${rows.length} matrícula(s).` : 'No encontré matrículas con esos filtros.',
      columns: [
        { key: 'studentName', label: 'Estudiante' },
        { key: 'courseName', label: 'Curso' },
        { key: 'status', label: 'Estado', kind: 'enum', enumKey: 'status' }
      ],
      rows,
      query: `GET /enrollments${filters.length ? ' · filtro: ' + filters.join(', ') : ''}`
    };
  }

  private teaching(q: string): AssistantReply {
    const teacher = this.resolvePerson(q, this.data.teachers);
    const course = this.resolveCourse(q);

    let rows = this.data.courseSubjects.filter(r => r.estado !== false);
    const filters: string[] = [];

    if (teacher) { rows = rows.filter(r => r.teacherId === teacher.id); filters.push(`docente «${teacher.fullName}»`); }
    if (course) { rows = rows.filter(r => r.courseName === course.name); filters.push(`curso ${course.name}`); }

    return {
      text: rows.length ? `${rows.length} asignación(es) de materia.` : 'No encontré asignaciones con esos filtros.',
      columns: [
        { key: 'courseName', label: 'Curso' },
        { key: 'subjectName', label: 'Materia' },
        { key: 'teacherName', label: 'Docente' }
      ],
      rows,
      query: `GET /course-subjects${filters.length ? ' · filtro: ' + filters.join(', ') : ''}`
    };
  }

  private entities(q: string): AssistantReply {
    const nq = normalize(q);
    const count = /cuantos|cuantas|total|numero de/.test(nq);

    // [palabra que lo detecta, listado, endpoint (para mostrar la consulta), sustantivo, columnas]
    const d = this.data;
    const kinds: [RegExp, readonly object[], string, string, ColumnDef[]][] = [
      [/estudiantes?|alumnos?/, d.students, '/students', 'estudiante(s)', [...PERSON_COLUMNS, { key: 'guardianName', label: 'Acudiente' }]],
      [/docentes?|profesores?/, d.teachers, '/teachers', 'docente(s)', [...PERSON_COLUMNS, { key: 'specialty', label: 'Especialidad' }]],
      [/coordinadores?/, d.coordinators, '/coordinators', 'coordinador(es)', [...PERSON_COLUMNS, { key: 'area', label: 'Área', kind: 'enum', enumKey: 'area' }]],
      [/rectores?|rector/, d.rectors, '/rectors', 'rector(es)', PERSON_COLUMNS],
      [/usuarios?/, d.users, '/users', 'usuario(s)', [...PERSON_COLUMNS, { key: 'role', label: 'Rol', kind: 'enum', enumKey: 'role' }]],
      [/cursos?/, d.courses, '/courses', 'curso(s)', [
        { key: 'name', label: 'Curso' }, { key: 'grade', label: 'Grado' }, { key: 'classroom', label: 'Salón' },
        { key: 'directorTeacherName', label: 'Director de curso' }
      ]],
      [/materias?/, d.subjects, '/subjects', 'materia(s)', [{ key: 'name', label: 'Materia' }]]
    ];

    const course = this.resolveCourse(q);
    const found = kinds.find(([re]) => re.test(nq));

    if (!found) {
      return { text: 'Indica sobre qué quieres consultar: estudiantes, docentes, coordinadores, rectores, usuarios, cursos o materias.', query: 'sin consulta' };
    }

    const [, list, endpoint, noun, columns] = found;
    let rows: readonly object[] = list;

    // "estudiantes del curso 10-A": se cruza con las matrículas activas
    if (endpoint === '/students' && course) {
      const ids = this.data.enrollments
        .filter(e => e.courseName === course.name && e.status === 'ACTIVE')
        .map(e => e.studentId);
      rows = d.students.filter(st => ids.includes(st.id));
    }

    const suffix = endpoint === '/students' && course ? ` del curso ${course.name}` : '';

    return {
      text: count ? `Hay ${rows.length} ${noun}${suffix}.` : `${rows.length} ${noun}${suffix}.`,
      columns,
      rows,
      query: `GET ${endpoint}${suffix ? ' · filtro: curso ' + course?.name : ''}`
    };
  }
}
