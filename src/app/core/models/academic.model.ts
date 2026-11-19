// Gestión académica: cursos, materias, asignaciones, matrículas, horarios, notas, asistencia,
// actividades, entregas y comunicados.
import { Auditable, Decimal, Entity } from './api.model';
import { AttendanceStatus, DayOfWeek, EnrollmentStatus, Period } from './domain-types';

/** GET /courses */
export interface Course extends Entity, Auditable {
  name: string;
  grade: string;
  classroom: string;
  schoolYear: number;
  directorTeacherId: number | null;
  directorTeacherName: string | null;
}

/** GET /subjects */
export interface Subject extends Entity, Auditable {
  name: string;
}

/** GET /course-subjects: qué docente dicta qué materia en qué curso. */
export interface CourseSubject extends Entity, Auditable {
  courseId: number;
  courseName: string;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
}

/** GET /enrollments */
export interface Enrollment extends Entity {
  studentId: number;
  studentName: string;
  courseId: number;
  courseName: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
}

/** GET /schedules · /schedules/me */
export interface Schedule extends Entity, Auditable {
  courseSubjectId: number;
  courseId: number;
  courseName: string;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

/** GET /grades · /grades/me · /grades/course-subject/{id} */
export interface Grade extends Entity {
  studentId: number;
  studentName: string;
  courseSubjectId: number;
  subjectName: string;
  courseName: string;
  teacherName: string;
  period: Period;
  value: Decimal;
}

/** POST /grades · PUT /grades/{id} */
export interface GradeRequest {
  studentId?: number;
  courseSubjectId?: number;
  period?: Period;
  value: number;
}

/** GET /attendances · /attendances/me · /attendances/course-subject/{id}?date= */
export interface Attendance extends Entity {
  studentId: number;
  studentName: string;
  courseSubjectId: number;
  subjectName: string;
  courseName: string;
  date: string;
  status: AttendanceStatus;
}

/** Un estudiante dentro de POST /attendances/bulk */
export interface AttendanceRecordRequest {
  studentId: number;
  status: AttendanceStatus;
}

/** POST /attendances/bulk: la asistencia de todo el grupo en una fecha */
export interface AttendanceBulkRequest {
  courseSubjectId: number;
  date: string;
  records: AttendanceRecordRequest[];
}

/** GET /assignments · /assignments/me */
export interface Assignment extends Entity, Auditable {
  courseSubjectId: number;
  courseId: number;
  courseName: string;
  subjectId: number;
  subjectName: string;
  teacherName: string;
  title: string;
  description: string;
  dueDate: string;
}

/** GET /submissions · /submissions/me */
export interface Submission extends Entity, Auditable {
  assignmentId: number;
  assignmentTitle: string;
  courseName: string;
  subjectName: string;
  dueDate: string;
  studentId: number;
  studentName: string;
  contenido: string;
  fechaEntrega: string;
  entregaTardia: boolean;
  calificada: boolean;
  nota: Decimal | null;
  retroalimentacion: string | null;
  calificadoPorNombre: string | null;
  fechaCalificacion: string | null;
}

/** PUT /submissions/{id}/grade */
export interface SubmissionGradeRequest {
  nota: number;
  retroalimentacion: string;
}

/** POST /submissions (estudiante) */
export interface SubmissionRequest {
  assignmentId: number;
  contenido: string;
}

/** PUT /submissions/{id} (el estudiante corrige su respuesta) */
export interface SubmissionUpdateRequest {
  contenido: string;
}

/** GET /announcements */
export interface Announcement extends Entity, Auditable {
  titulo: string;
  contenido: string;
  publicadoPorNombre: string;
  publicadoPorRol: string;
}
