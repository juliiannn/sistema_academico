import { Injectable, inject } from '@angular/core';
import { API_ENDPOINTS, MAIN_API } from '../config';
import { Option } from '../models/crud.model';
import { enumLabel } from '../models/enums';
import { Row } from '../models/row.model';
import { httpJson } from '../utils/http';
import { AuthService } from './auth';

interface Maps {
  students: Map<number, string>;
  teachers: Map<number, string>;
  courses: Map<number, string>;
  subjects: Map<number, string>;
  courseSubjects: Map<number, Row>;
  assignments: Map<number, Row>;
  loadedAt: number;
  token: string | null;   // la caché es de UNA sesión: al cambiar de usuario se vuelve a pedir
}

const TTL_MS = 60_000;

// Tu backend devuelve ids (studentId, courseId, ...). Aquí se consultan los listados y se agregan los NOMBRES
// (studentName, courseName, subjectName, teacherName, directorTeacherName) para que las tablas muestren información
// legible. Si el backend ya envía esos nombres, no se sobreescriben.
@Injectable({ providedIn: 'root' })
export class ReferenceService {

  private auth = inject(AuthService);
  private maps: Maps | null = null;
  private pending: Promise<Maps> | null = null;

  /** Se llama después de cada creación o cambio, para que los nombres se refresquen. */
  invalidate(): void {
    this.maps = null;
  }

  // ---------- lectura sin enriquecer (evita ciclos) ----------

  async raw(endpoint: string): Promise<Row[]> {
    try {
      const res = await httpJson(MAIN_API.baseUrl + endpoint, 'GET', undefined, this.auth.token(), MAIN_API.timeoutMs);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];   // sin permiso o módulo no disponible para este rol: simplemente no hay opciones
    }
  }

  private async load(): Promise<Maps> {

    if (this.maps && this.maps.token === this.auth.token() && Date.now() - this.maps.loadedAt < TTL_MS) {
      return this.maps;
    }

    if (!this.pending) {
      const token = this.auth.token();
      this.pending = (async () => {
        const [students, teachers, courses, subjects, courseSubjects, assignmentsAll] = await Promise.all([
          this.raw('/students'), this.raw('/teachers'), this.raw('/courses'), this.raw('/subjects'), this.raw('/course-subjects'),
          this.raw('/assignments')
        ]);
        // El estudiante no lista /assignments: se usa /assignments/me
        const assignments = assignmentsAll.length ? assignmentsAll : await this.raw('/assignments/me');

        const named = (rows: Row[], field: string) =>
          new Map<number, string>(rows.map(r => [Number(r['id']), String(r[field] ?? '')]));

        const maps: Maps = {
          students: named(students, 'fullName'),
          teachers: named(teachers, 'fullName'),
          courses: named(courses, 'name'),
          subjects: named(subjects, 'name'),
          courseSubjects: new Map(courseSubjects.map(r => [Number(r['id']), r])),
          assignments: new Map(assignments.map(r => [Number(r['id']), r])),
          loadedAt: Date.now(),
          token
        };

        this.maps = maps;
        return maps;
      })().finally(() => { this.pending = null; });
    }

    return this.pending;
  }

  // ---------- enriquecimiento ----------

  async enrich(data: unknown): Promise<unknown> {

    const isRow = (x: unknown): x is Row => typeof x === 'object' && x !== null && !Array.isArray(x);
    // Solo se consultan los listados si a alguna fila le falta un nombre (la API ya envía studentName, courseName...)
    const pairs: [string, string][] = [
      ['studentId', 'studentName'], ['courseId', 'courseName'], ['subjectId', 'subjectName'], ['teacherId', 'teacherName'],
      ['courseSubjectId', 'subjectName'], ['assignmentId', 'assignmentTitle']
    ];
    const needs = (rows: Row[]) => rows.some(r => pairs.some(([id, name]) => r[id] != null && (r[name] === undefined || r[name] === '')));

    const rows: Row[] = Array.isArray(data) ? data.filter(isRow) : isRow(data) ? [data] : [];

    if (rows.length === 0 || !needs(rows)) {
      return data;
    }

    const m = await this.load();
    const out = rows.map(r => this.enrichRow(r, m));

    return Array.isArray(data) ? out : out[0];
  }

  private enrichRow(row: Row, m: Maps): Row {

    const r: Row = { ...row };
    const fill = (key: string, value: string | undefined) => {
      if ((r[key] === undefined || r[key] === null || r[key] === '') && value) {
        r[key] = value;
      }
    };

    if (r['studentId'] != null) { fill('studentName', m.students.get(Number(r['studentId']))); }
    if (r['directorTeacherId'] != null) { fill('directorTeacherName', m.teachers.get(Number(r['directorTeacherId']))); }

    // Respuestas / entregas: el título y la fecha salen de la actividad
    const assignment = r['assignmentId'] != null ? m.assignments.get(Number(r['assignmentId'])) : undefined;
    if (assignment) {
      fill('assignmentTitle', String(assignment['title'] ?? ''));
      fill('dueDate', String(assignment['dueDate'] ?? ''));
    }

    const csId = r['courseSubjectId'] ?? assignment?.['courseSubjectId'];
    const cs = csId != null ? m.courseSubjects.get(Number(csId)) : undefined;
    const courseId = r['courseId'] ?? cs?.['courseId'];
    const subjectId = r['subjectId'] ?? cs?.['subjectId'];
    const teacherId = r['teacherId'] ?? cs?.['teacherId'];

    if (courseId != null) { fill('courseName', m.courses.get(Number(courseId))); }
    if (subjectId != null) { fill('subjectName', m.subjects.get(Number(subjectId))); }
    if (teacherId != null) { fill('teacherName', m.teachers.get(Number(teacherId))); }


    return r;
  }

  // ---------- opciones de los selectores (se ven NOMBRES, el valor es el id) ----------

  async options(ref: string): Promise<Option[]> {

    const sorted = (list: Option[]) => list.sort((x, y) => x.label.localeCompare(y.label, 'es'));
    const person = (p: Row) => `${p['fullName']} (${p['document']})`;

    if (ref === 'students') {
      return sorted((await this.raw('/students')).map(s => ({ value: String(s['id']), label: person(s) })));
    }

    if (ref === 'studentEmails') {
      return sorted((await this.raw('/students')).map(s => ({ value: String(s['email']), label: person(s) })));
    }

    if (ref === 'teachers') {
      return sorted((await this.raw('/teachers')).map(t => ({ value: String(t['id']), label: String(t['fullName']) })));
    }

    if (ref === 'courses') {
      return sorted((await this.raw('/courses')).map(c => ({
        value: String(c['id']),
        label: c['estado'] === false ? `${c['name']} (inactivo)` : String(c['name'])
      })));
    }

    if (ref === 'subjects') {
      return sorted((await this.raw('/subjects')).map(s => ({ value: String(s['id']), label: String(s['name']) })));
    }

    if (ref === 'courseSubjects') {
      // La API ya envía courseName, subjectName y teacherName (el docente solo recibe sus asignaciones)
      const rows = (await this.raw('/course-subjects')).filter(cs => cs['estado'] !== false);
      return sorted(rows.map(cs => ({
        value: String(cs['id']),
        label: `${cs['courseName']} · ${cs['subjectName']} (${cs['teacherName']})`
      })));
    }

    // Estudiantes que todavía no tienen un PIAR activo
    if (ref === 'piarStudents') {
      const [students, piar] = await Promise.all([this.raw('/students'), this.raw(API_ENDPOINTS.piar)]);
      const taken = new Set(piar.filter(r => r['estado'] !== false).map(r => Number(r['studentId'])));
      return sorted(students.filter(s => !taken.has(Number(s['id']))).map(s => ({ value: String(s['id']), label: person(s) })));
    }

    // Actividades a las que el estudiante aún puede responder (sin respuesta activa)
    if (ref === 'myAssignments') {
      const [assignments, submissions] = await Promise.all([this.raw('/assignments/me'), this.raw(API_ENDPOINTS.mySubmissions)]);
      const done = new Set(submissions.filter(s => s['estado'] !== false).map(s => Number(s['assignmentId'])));
      return sorted(
        assignments
          .filter(a => !done.has(Number(a['id'])))
          .map(a => ({ value: String(a['id']), label: `${a['title']} (entrega ${a['dueDate']})` }))
      );
    }

    // Roles y módulos (pantalla Roles y módulos): se ven los nombres
    if (ref === 'roles') {
      return sorted((await this.raw('/roles')).filter(r => r['estado'] !== false)
        .map(r => ({ value: String(r['id']), label: enumLabel('role', r['nombre']) })));
    }

    if (ref === 'modules') {
      return sorted((await this.raw('/modules')).filter(m => m['estado'] !== false)
        .map(m => ({ value: String(m['id']), label: String(m['nombre']) })));
    }

    return [];
  }
}
