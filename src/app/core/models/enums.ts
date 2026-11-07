// Valores permitidos (los que viajan en los datos) y su etiqueta en español (lo que ve el usuario)
export const ENUM_LABELS: Record<string, Record<string, string>> = {
  documentType: { TI: 'Tarjeta de identidad', CC: 'Cédula de ciudadanía', CE: 'Cédula de extranjería', PASSPORT: 'Pasaporte' },
  gender: { MALE: 'Masculino', FEMALE: 'Femenino', OTHER: 'Otro' },
  educationLevel: { BACHELOR: 'Bachiller', UNDERGRADUATE: 'Pregrado', SPECIALIST: 'Especialista', MASTER: 'Magíster', DOCTORATE: 'Doctorado' },
  contractType: { FULL_TIME: 'Tiempo completo', PART_TIME: 'Medio tiempo', HOURLY: 'Por horas', TEMPORARY: 'Temporal' },
  area: { ACADEMIC: 'Académica', DISCIPLINE: 'Disciplina', ADMINISTRATIVE: 'Administrativa' },
  status: { ACTIVE: 'Activa', CANCELLED: 'Cancelada', COMPLETED: 'Completada' },
  period: { PERIOD_1: 'Periodo 1', PERIOD_2: 'Periodo 2', PERIOD_3: 'Periodo 3', PERIOD_4: 'Periodo 4' },
  attendanceStatus: { PRESENT: 'Presente', ABSENT: 'Ausente', LATE: 'Tarde' },
  dayOfWeek: { MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves', FRIDAY: 'Viernes' },
  disability: {
    VISUAL: 'Discapacidad visual', HEARING: 'Discapacidad auditiva', INTELLECTUAL: 'Discapacidad intelectual',
    PHYSICAL: 'Discapacidad física', PSYCHOSOCIAL: 'Discapacidad psicosocial', MULTIPLE: 'Discapacidad múltiple',
    DEAFBLIND: 'Sordoceguera', AUTISM: 'Trastorno del espectro autista (TEA)', ADHD: 'TDAH', OTHER: 'Otra'
  },
  supportType: {
    AGENDA_DIA: 'Agenda del día', RUTINA: 'Rutina', TAREA_PASOS: 'Tarea por pasos',
    ANTICIPACION: 'Anticipación', NORMAS: 'Normas'
  },
  auditAction: { CREATE: 'Crear', READ: 'Consultar', UPDATE: 'Actualizar', DELETE: 'Desactivar', LOGIN: 'Ingreso', OTHER: 'Otra' },
  yesNo: { true: 'Sí', false: 'No' },
  scope: { ALL: 'Todos los datos', ASSIGNED: 'Solo sus cursos', OWN: 'Solo lo propio' },
  submissionState: { GRADED: 'Calificada', PENDING: 'Pendiente de calificar', LATE: 'Entregada tarde' },
  role: { ADMIN: 'Administrador', RECTOR: 'Rector', COORDINATOR: 'Coordinador', TEACHER: 'Docente', STUDENT: 'Estudiante', USER: 'Usuario' }
};

export function enumValues(enumKey: string): string[] {
  return Object.keys(ENUM_LABELS[enumKey] ?? {});
}

export function enumLabel(enumKey: string | undefined, value: unknown): string {
  const text = String(value ?? '');
  return (enumKey && ENUM_LABELS[enumKey]?.[text]) || text;
}
