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
import { Row } from '../models/row.model';
import {
  Intent, detectDay, detectDisability, detectIntent, detectPeriod, findByName, findCourse,
  findPersonByName, normalize, refersToPrevious
} from '../utils/assistant-nlu';

export interface AssistantReply {
  text: string;
  columns?: ColumnDef[];
  rows?: Row[];
  query: string;        // consulta que se ejecutó (transparencia)
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
  private lastPerson: Row | null = null;
  private lastCourse: Row | null = null;

  readonly examples = [
    '¿Cuántos estudiantes hay?',
    'Estudiantes con discapacidad',
    'Estudiantes con TDAH',
    '¿Qué notas tiene Ana Torres?',
    'Promedio de notas por materia',
    'Ausencias de Luis Martínez',
    'Estudiantes matriculados en 10-A',
    '¿Qué materias dicta Carlos Gómez?',
    'Actividades próximas',
    'Horario del curso 10-A',
    'Apoyos visuales de Luis Martínez'
  ];

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
      throw new Error('El asistente es solo para administración, rectoría y coordinación.');
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

    const system =
      'Eres el asistente de consultas de un colegio. Respondes en español, breve y claro. ' +
      'Usa ÚNICAMENTE los datos de abajo; si la respuesta no está en ellos, dilo y no inventes. ' +
      'Solo consultas: nunca digas que modificaste datos. Escala de notas: 0 a 10. ' +
      `Rol de quien pregunta: ${enumLabel('role', this.auth.role())}.\n\nDATOS:\n${context}`;

    const turns: ChatTurn[] = [{ role: 'system', content: system }, ...this.history.slice(-6), { role: 'user', content: question }];

    try {
      const answer = await this.ollama.chat(turns);
      const next: ChatTurn[] = [{ role: 'user', content: question }, { role: 'assistant', content: answer }];
      this.history = [...this.history, ...next].slice(-8);
      return { text: answer, query: `${this.engine()} · contexto de ${records} registros (solo lectura)` };
    } catch (error) {
      const fallback = await this.answer(intent, question);
      return { ...fallback, text: `${fallback.text}\n\n(No pude usar la IA local: ${errorText(error)} Respondí con el asistente básico.)` };
    }
  }

  // Resumen de datos, ya filtrado por el rol (se usan los mismos "endpoints" de las pantallas)
  private buildContext(): { context: string; records: number } {
    const lines: string[] = [];
    const add = (title: string, rows: string[]) => { lines.push(`## ${title} (${rows.length})`, ...rows.slice(0, 120)); };
    const safe = (endpoint: string): Row[] => this.list(endpoint);

    const enrollments = safe('/enrollments');
    const piar = safe(API_ENDPOINTS.piar).filter(r => r['estado'] !== false);
    const courseOf = (id: unknown) => enrollments.find(e => e['studentId'] === id && e['status'] === 'ACTIVE')?.['courseName'] ?? 'sin curso';
    const piarOf = (id: unknown) => {
      const r = piar.find(x => x['studentId'] === id);
      return r ? `PIAR: ${enumLabel('disability', r['disability'])}` : 'sin PIAR';
    };

    add('Estudiantes (nombre | curso | PIAR)', safe('/students').map(s => `${s['fullName']} | ${courseOf(s['id'])} | ${piarOf(s['id'])}`));
    add('Docentes', safe('/teachers').map(t => `${t['fullName']} | ${t['specialty'] ?? ''}`));
    add('Cursos (curso | director)', safe('/courses').map(c => `${c['name']} | ${c['directorTeacherName']}`));
    add('Materias por curso (curso | materia | docente)', safe('/course-subjects').map(c => `${c['courseName']} | ${c['subjectName']} | ${c['teacherName']}`));
    add('Notas (estudiante | materia | periodo | nota)', safe('/grades').map(g => `${g['studentName']} | ${g['subjectName']} | ${enumLabel('period', g['period'])} | ${g['value']}`));
    add('Asistencia (estudiante | materia | fecha | estado)', safe('/attendances').map(a => `${a['studentName']} | ${a['subjectName']} | ${a['date']} | ${enumLabel('attendanceStatus', a['status'])}`));
    add('Actividades (título | curso | materia | entrega)', safe('/assignments').map(a => `${a['title']} | ${a['courseName']} | ${a['subjectName']} | ${a['dueDate']}`));
    add('PIAR activos (estudiante | discapacidad | observaciones)', piar.map(r => `${r['studentName']} | ${enumLabel('disability', r['disability'])} | ${r['observaciones'] ?? ''}`));

    const context = lines.join('\n').slice(0, 14000);
    return { context, records: lines.filter(l => !l.startsWith('##')).length };
  }

  // ---------- acceso a datos (solo GET) ----------

  // Foto de los datos que el rol actual puede consultar. Se pide al backend al inicio de cada pregunta
  // (solo GET) y las respuestas se arman sobre ella.
  private snapshot = new Map<string, Row[]>();

  private async loadSnapshot(): Promise<void> {
    const endpoints = [
      '/students', '/teachers', '/coordinators', '/rectors', '/users', '/courses', '/subjects',
      '/course-subjects', '/enrollments', '/grades', '/attendances', '/assignments', '/schedules', API_ENDPOINTS.piar
    ];
    const results = await Promise.all(endpoints.map(async endpoint => {
      try {
        const data = (await this.main.get(endpoint)).data;
        const rows = Array.isArray(data) ? data as Row[] : [];
        return [endpoint, endpoint === API_ENDPOINTS.piar ? withDisability(rows) : rows] as [string, Row[]];
      } catch {
        return [endpoint, []] as [string, Row[]];   // sin permiso para ese listado: el asistente simplemente no lo ve
      }
    }));
    this.snapshot = new Map(results);
  }

  private list(endpoint: string): Row[] {
    return this.snapshot.get(endpoint) ?? [];
  }

  private people(): Row[] {
    return [
      ...this.list('/students'), ...this.list('/teachers'),
      ...this.list('/coordinators'), ...this.list('/rectors')
    ];
  }

  private resolvePerson(question: string, pool: Row[]): Row | null {
    const found = findPersonByName(question, pool);
    if (found) {
      this.lastPerson = found;
      return found;
    }
    if (refersToPrevious(question) && this.lastPerson && pool.some(p => p['id'] === this.lastPerson?.['id'])) {
      return this.lastPerson;
    }
    return null;
  }

  private resolveCourse(question: string): Row | null {
    const found = findCourse(question, this.list('/courses'));
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
    const rows = this.list(API_ENDPOINTS.piar).filter(r => r['estado'] !== false && (!code || r['disability'] === code));
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
    const person = this.resolvePerson(q, this.list('/students'));
    const email = person ? String(person['email']) : undefined;
    const items = await this.api.listAllSupports(email ? { estudiante_email: email } : {});
    const rows = items.filter(s => s.estado).map(s => ({ ...s, studentName: this.nameOfEmail(s.estudiante_email) }));

    return {
      text: person
        ? `${rows.length} apoyo(s) visual(es) activo(s) de ${person['fullName']}.`
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
    const person = this.people().find(p => String(p['email']).toLowerCase() === email.toLowerCase());
    return person ? String(person['fullName']) : email;
  }

  private grades(q: string): AssistantReply {
    const period = detectPeriod(q);
    const person = this.resolvePerson(q, this.list('/students'));
    const subject = findByName(q, this.list('/subjects'));
    const course = person ? null : this.resolveCourse(q);
    const wantsAverage = /promedio|rendimiento|desempeno/.test(normalize(q));

    let grades = this.list('/grades');
    const filters: string[] = [];

    if (person) { grades = grades.filter(g => g['studentId'] === person['id']); filters.push(`estudiante «${person['fullName']}»`); }
    if (course) { grades = grades.filter(g => g['courseName'] === course['name']); filters.push(`curso ${course['name']}`); }
    if (subject) { grades = grades.filter(g => g['subjectName'] === subject['name']); filters.push(`materia ${subject['name']}`); }
    if (period) { grades = grades.filter(g => g['period'] === period); filters.push(enumLabel('period', period)); }

    const query = `GET /grades${filters.length ? ' · filtro: ' + filters.join(', ') : ''}`;

    if (grades.length === 0) {
      return { text: 'No encontré notas con esos filtros.', query };
    }

    const avg = (list: Row[]) => Math.round((list.reduce((s, g) => s + Number(g['value']), 0) / list.length) * 100) / 100;

    if (wantsAverage && !person) {
      const bySubject = new Map<string, Row[]>();
      grades.forEach(g => bySubject.set(String(g['subjectName']), [...(bySubject.get(String(g['subjectName'])) ?? []), g]));
      const rows = [...bySubject.entries()].map(([name, list]) => ({ subjectName: name, average: avg(list), count: list.length }));
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
        ? `${person['fullName']}: ${grades.length} nota(s), promedio ${avg(grades)}.`
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
    const person = this.resolvePerson(q, this.list('/students'));
    const course = person ? null : this.resolveCourse(q);

    let status: string | null = null;
    if (/ausen|inasistencia|falta/.test(nq)) { status = 'ABSENT'; }
    else if (/tarde|tardanza/.test(nq)) { status = 'LATE'; }

    let records = this.list('/attendances');
    const filters: string[] = [];

    if (person) { records = records.filter(r => r['studentId'] === person['id']); filters.push(`estudiante «${person['fullName']}»`); }
    if (course) { records = records.filter(r => r['courseName'] === course['name']); filters.push(`curso ${course['name']}`); }
    if (status) { records = records.filter(r => r['status'] === status); filters.push(enumLabel('attendanceStatus', status)); }

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
    const teacher = findPersonByName(q, this.list('/teachers'));

    let rows = this.list('/schedules');
    const filters: string[] = [];

    if (course) { rows = rows.filter(r => r['courseName'] === course['name']); filters.push(`curso ${course['name']}`); }
    if (day) { rows = rows.filter(r => r['dayOfWeek'] === day); filters.push(enumLabel('dayOfWeek', day)); }
    if (teacher) {
      const mine = this.list('/course-subjects').filter(cs => cs['teacherId'] === teacher['id']).map(cs => cs['id']);
      rows = rows.filter(r => mine.includes(r['courseSubjectId']));
      filters.push(`docente «${teacher['fullName']}»`);
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

    let rows = this.list('/assignments');
    const filters: string[] = [];

    if (course) { rows = rows.filter(r => r['courseName'] === course['name']); filters.push(`curso ${course['name']}`); }
    if (upcoming) { rows = rows.filter(r => String(r['dueDate']) >= today); filters.push(`entrega desde ${today}`); }

    rows = [...rows].sort((a, b) => String(a['dueDate']).localeCompare(String(b['dueDate'])));

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
    const person = course ? null : this.resolvePerson(q, this.list('/students'));

    let rows = this.list('/enrollments');
    const filters: string[] = [];

    if (course) { rows = rows.filter(r => r['courseName'] === course['name']); filters.push(`curso ${course['name']}`); }
    if (person) { rows = rows.filter(r => r['studentId'] === person['id']); filters.push(`estudiante «${person['fullName']}»`); }

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
    const teacher = this.resolvePerson(q, this.list('/teachers'));
    const course = this.resolveCourse(q);

    let rows = this.list('/course-subjects').filter(r => r['estado'] !== false);
    const filters: string[] = [];

    if (teacher) { rows = rows.filter(r => r['teacherId'] === teacher['id']); filters.push(`docente «${teacher['fullName']}»`); }
    if (course) { rows = rows.filter(r => r['courseName'] === course['name']); filters.push(`curso ${course['name']}`); }

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

    const kinds: [RegExp, string, string, ColumnDef[]][] = [
      [/estudiantes?|alumnos?/, '/students', 'estudiante(s)', [...PERSON_COLUMNS, { key: 'guardianName', label: 'Acudiente' }]],
      [/docentes?|profesores?/, '/teachers', 'docente(s)', [...PERSON_COLUMNS, { key: 'specialty', label: 'Especialidad' }]],
      [/coordinadores?/, '/coordinators', 'coordinador(es)', [...PERSON_COLUMNS, { key: 'area', label: 'Área', kind: 'enum', enumKey: 'area' }]],
      [/rectores?|rector/, '/rectors', 'rector(es)', PERSON_COLUMNS],
      [/usuarios?/, '/users', 'usuario(s)', [...PERSON_COLUMNS, { key: 'role', label: 'Rol', kind: 'enum', enumKey: 'role' }]],
      [/cursos?/, '/courses', 'curso(s)', [
        { key: 'name', label: 'Curso' }, { key: 'grade', label: 'Grado' }, { key: 'classroom', label: 'Salón' },
        { key: 'directorTeacherName', label: 'Director de curso' }
      ]],
      [/materias?/, '/subjects', 'materia(s)', [{ key: 'name', label: 'Materia' }]]
    ];

    const course = this.resolveCourse(q);
    const found = kinds.find(([re]) => re.test(nq));

    if (!found) {
      return { text: 'Indica sobre qué quieres consultar: estudiantes, docentes, coordinadores, rectores, usuarios, cursos o materias.', query: 'sin consulta' };
    }

    const [, endpoint, noun, columns] = found;
    let rows = this.list(endpoint);

    // "estudiantes del curso 10-A": se cruza con las matrículas activas
    if (endpoint === '/students' && course) {
      const ids = this.list('/enrollments')
        .filter(e => e['courseName'] === course['name'] && e['status'] === 'ACTIVE')
        .map(e => e['studentId']);
      rows = rows.filter(r => ids.includes(r['id']));
    }

    const suffix = endpoint === '/students' && course ? ` del curso ${course['name']}` : '';

    return {
      text: count ? `Hay ${rows.length} ${noun}${suffix}.` : `${rows.length} ${noun}${suffix}.`,
      columns,
      rows,
      query: `GET ${endpoint}${suffix ? ' · filtro: curso ' + course?.['name'] : ''}`
    };
  }
}
