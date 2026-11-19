// Personas del colegio: usuarios y sus perfiles (estudiante, docente, coordinador, rector).
import { Auditable, Entity } from './api.model';
import { ContractType, CoordinatorArea, DocumentType, EducationLevel, Gender, RoleName } from './domain-types';

/** Datos personales comunes (tabla users). */
export interface PersonData {
  document: string;
  documentType: DocumentType | null;
  fullName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  gender: Gender | null;
  address: string | null;
  enabled: boolean;
}

/** GET /users */
export interface User extends Entity, Auditable, PersonData {
  role: RoleName;
  mustChangePassword: boolean;
}

/** Base de todo perfil: la persona más el id de su usuario. */
export interface Profile extends Entity, Auditable, PersonData {
  userId: number;
}

/** GET /students · /students/me · /enrollments/course/{id}/students */
export interface Student extends Profile {
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
}

/** GET /teachers */
export interface Teacher extends Profile {
  employeeCode: string;
  hireDate: string | null;
  profession: string | null;
  specialty: string | null;
  educationLevel: EducationLevel | null;
  contractType: ContractType | null;
}

/** GET /coordinators */
export interface Coordinator extends Profile {
  employeeCode: string;
  area: CoordinatorArea;
  assignmentDate: string | null;
  educationLevel: EducationLevel | null;
}

/** GET /rectors */
export interface Rector extends Profile {
  employeeCode: string;
  appointmentDate: string | null;
  administrativePeriod: string | null;
  educationLevel: EducationLevel | null;
}

/** Cualquier persona con perfil (para buscar por nombre en el asistente). */
export type AnyProfile = Student | Teacher | Coordinator | Rector;
