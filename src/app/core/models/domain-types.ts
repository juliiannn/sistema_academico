// Valores fijos (enums) que maneja la API. Sus etiquetas en español están en enums.ts.

export type RoleName = 'ADMIN' | 'RECTOR' | 'COORDINATOR' | 'TEACHER' | 'STUDENT';
export type DocumentType = 'RC' | 'TI' | 'CC' | 'CE' | 'PASSPORT';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type Period = 'PERIOD_1' | 'PERIOD_2' | 'PERIOD_3' | 'PERIOD_4';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';
export type EnrollmentStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
export type EducationLevel = 'BACHELOR' | 'UNDERGRADUATE' | 'SPECIALIST' | 'MASTER' | 'DOCTORATE';
export type ContractType = 'FULL_TIME' | 'PART_TIME' | 'HOURLY' | 'TEMPORARY';
export type CoordinatorArea = 'ACADEMIC' | 'DISCIPLINE' | 'ADMINISTRATIVE';
export type AdjustmentType = 'ACCESS' | 'CURRICULAR' | 'METHODOLOGICAL' | 'EVALUATIVE';
export type ProgressLevel = 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED';
export type PermissionScope = 'ALL' | 'ASSIGNED' | 'OWN';
