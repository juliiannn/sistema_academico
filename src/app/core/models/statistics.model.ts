// Estadísticas del panel (GET /statistics/*) e indicadores calculados en el frontend.
import { Decimal } from './api.model';

/** GET /statistics/general */
export interface GeneralStatistics {
  totalStudents: number;
  totalTeachers: number;
  totalCoordinators: number;
  activeCourses: number;
  totalSubjects: number;
}

/** GET /statistics/students-by-course */
export interface StudentsByCourse {
  courseId: number;
  courseName: string;
  studentCount: number;
}

/** GET /statistics/average-grades: promedio de cada curso-materia. */
export interface AverageGrade {
  courseId: number;
  courseName: string;
  subjectId: number;
  subjectName: string;
  averageGrade: Decimal;
  totalGrades: number;
}

/** GET /statistics/attendance-rate */
export interface AttendanceRate {
  courseId: number;
  courseName: string;
  attendanceRate: Decimal;
  totalRecords: number;
}

/** Tarjeta de indicador (KPI) del tablero. */
export interface KpiCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'red';
}

/** Serie de datos que recibe un gráfico. */
export interface ChartSeries {
  labels: string[];
  values: number[];
  colors?: string[];
}

/** Gráfico del tablero: título, tipo y datos. */
export interface DashboardChart {
  title: string;
  subtitle: string;
  type: 'bar' | 'hbar' | 'line' | 'donut';
  data: ChartSeries;
  unit?: string;
  max?: number;
}
