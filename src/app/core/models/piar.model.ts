// PIAR (Decreto 1421 de 2017): plan individual de ajustes razonables de un estudiante.
import { Auditable, Entity } from './api.model';
import { AdjustmentType, Period, ProgressLevel } from './domain-types';

/** GET /special-needs: catálogo de necesidades educativas. */
export interface SpecialNeed extends Entity, Auditable {
  nombre: string;
  descripcion: string | null;
}

/** Necesidad educativa registrada en un PIAR. */
export interface PiarNeed {
  specialNeedId: number;
  nombre: string;
  diagnostico: string | null;
}

/** Meta del plan (general o de una materia). */
export interface PiarGoal extends Entity {
  piarId: number;
  courseSubjectId: number | null;
  subjectName: string | null;
  descripcion: string;
}

/** Ajuste razonable (de acceso, curricular, metodológico o evaluativo). */
export interface PiarAdjustment extends Entity {
  piarId: number;
  courseSubjectId: number | null;
  subjectName: string | null;
  tipo: AdjustmentType;
  descripcion: string;
}

/** GET /piars · /piars/{id} · /piars/me */
export interface Piar extends Entity, Auditable {
  studentId: number;
  studentName: string;
  courseId: number | null;
  courseName: string | null;
  schoolYear: number;
  fechaInicio: string;
  fechaFin: string | null;
  observaciones: string | null;
  consentimientoAcudiente: boolean;
  needs: PiarNeed[];
  goals: PiarGoal[];
  adjustments: PiarAdjustment[];
}

/** PIAR con el código de discapacidad principal ya calculado (lo agrega withDisability en el frontend). */
export interface PiarWithDisability extends Piar {
  disability: string;      // código del enum disability (VISUAL, AUTISM...)
  necesidades: string;     // nombres de las necesidades separados por coma
}

/** GET /piars/{id}/progress · /piars/me/progress: avance de una meta en un periodo. */
export interface PiarProgress extends Entity {
  piarGoalId: number;
  period: Period;
  nivel: ProgressLevel;
  observaciones: string | null;
  registradoPor: number;
  teacherName: string;
}

/** POST /piars/goals */
export interface PiarGoalRequest {
  piarId: number;
  courseSubjectId: number | null;
  descripcion: string;
}

/** POST /piars/adjustments */
export interface PiarAdjustmentRequest {
  piarId: number;
  courseSubjectId: number | null;
  tipo: AdjustmentType;
  descripcion: string;
}

/** POST /piars/progress */
export interface PiarProgressRequest {
  piarGoalId: number;
  period: Period;
  nivel: ProgressLevel;
  observaciones: string | null;
}

/** PUT /piars/progress/{id} */
export interface PiarProgressUpdateRequest {
  nivel: ProgressLevel;
  observaciones: string | null;
}

/** Necesidad educativa que se registra al crear el PIAR. */
export interface PiarNeedRequest {
  specialNeedId: number;
}

/** POST /piars */
export interface PiarCreateRequest {
  studentId: number;
  schoolYear: number;
  observaciones: string | null;
  consentimientoAcudiente: boolean;
  needs: PiarNeedRequest[];
}

/** PUT /piars/{id} */
export interface PiarUpdateRequest {
  observaciones: string | null;
  consentimientoAcudiente: boolean;
  fechaFin: string | null;
}
