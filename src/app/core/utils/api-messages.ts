// La API principal responde en inglés (algunos mensajes ya vienen en español).
// Aquí se traducen para mostrarlos al usuario. El primer patrón que coincida gana.
const MESSAGES: [RegExp, string][] = [
  // Credenciales y sesión
  [/^Invalid credentials/i, 'Correo o contraseña incorrectos.'],
  [/Current password is incorrect/i, 'La contraseña actual no es correcta.'],
  [/New password must be different/i, 'La nueva contraseña debe ser diferente de la actual.'],
  [/No (teacher|student) profile found/i, 'Tu usuario no tiene un perfil asociado para esta acción.'],

  // Duplicados
  [/Email already exists/i, 'Ya existe un usuario con ese correo.'],
  [/Document already exists/i, 'Ya existe una persona con ese documento.'],
  [/Employee code already exists/i, 'Ya existe un empleado con ese código.'],
  [/Course already exists/i, 'Ya existe un curso con ese nombre en ese año escolar.'],
  [/Subject already exists/i, 'Ya existe una materia con ese nombre.'],
  [/Special need already exists/i, 'Ya existe esa necesidad educativa.'],
  [/Role already exists/i, 'Ya existe un rol con ese nombre.'],
  [/Module name already exists/i, 'Ya existe un módulo con ese nombre.'],
  [/Module route already exists/i, 'Ya existe un módulo con esa ruta.'],
  [/This module is already assigned to the role/i, 'Ese módulo ya está asignado a ese rol.'],
  [/This subject is already assigned to this course/i, 'Esa materia ya está asignada a ese curso.'],
  [/A grade already exists/i, 'Ya hay una nota para ese estudiante, materia y periodo.'],
  [/Attendance already registered/i, 'Ya hay asistencia registrada para ese estudiante, materia y fecha.'],
  [/already submitted this assignment/i, 'Ya respondiste esta actividad; edita tu entrega.'],
  [/already has a PIAR for that school year/i, 'El estudiante ya tiene un PIAR para ese año escolar.'],
  [/This need is already registered in the PIAR/i, 'Esa necesidad ya está registrada en el PIAR.'],
  [/That need is not registered in the PIAR/i, 'Esa necesidad no está registrada en el PIAR.'],
  [/Progress already registered for this goal and period/i, 'Ya hay un avance registrado para esa meta en ese periodo; edítalo.'],

  // Matrículas
  [/already enrolled/i, 'El estudiante ya está matriculado en ese curso.'],
  [/no active enrollment to transfer/i, 'El estudiante no tiene una matrícula activa para trasladar.'],
  [/not actively enrolled in this course/i, 'El estudiante no está matriculado en ese curso.'],
  [/not actively enrolled in any course/i, 'No estás matriculado en ningún curso.'],

  // Reglas de negocio
  [/inactive course-subject|inactive course\b|inactive subject/i, 'No se puede: el curso o la materia está desactivado.'],
  [/End date must not be before start date/i, 'La fecha final no puede ser anterior a la inicial.'],
  [/Start time must be before end time/i, 'La hora de inicio debe ser anterior a la de fin.'],
  [/another class scheduled at that time/i, 'Ya hay otra clase en ese horario.'],
  [/graded submission can no longer be modified/i, 'La entrega ya fue calificada y no se puede modificar.'],
  [/subject does not belong to the student's current course/i, 'Esa materia no se dicta en el curso actual del estudiante.'],

  // Alcance de permisos
  [/use subjects you teach/i, 'Solo puedes usar materias que tú dictas.'],
  [/PIAR of students from your assigned courses/i, 'Solo puedes acceder al PIAR de estudiantes de tus cursos.'],
  [/your own PIAR/i, 'Solo puedes ver tu propio PIAR.'],
  [/students from courses where you teach/i, 'Solo puedes ver estudiantes de los cursos donde dictas clase.'],
  [/subjects assigned to you/i, 'Solo puedes hacerlo en las materias que tienes asignadas.'],
  [/your own assigned subjects/i, 'Solo puedes ver tus propias materias.'],
  [/assignments from your own course/i, 'Solo puedes responder actividades de tu curso.'],
  [/You can only (view|modify) your own/i, 'Solo puedes acceder a tu propia información.'],

  // Chat
  [/You are not part of this conversation/i, 'No participas en esa conversación.'],
  [/The message is empty/i, 'El mensaje está vacío.'],
  [/The message exceeds (\d+) characters/i, 'El mensaje supera el máximo de caracteres permitido.'],
  [/The message must be text/i, 'El mensaje debe ser texto.'],
  [/You cannot chat with yourself/i, 'No puedes abrir un chat contigo mismo.'],
  [/You cannot start a chat with this user/i, 'No puedes iniciar un chat privado con esa persona.'],
  [/The other user is no longer active/i, 'Esa persona ya no está activa en la plataforma.'],
  [/Conversation not found/i, 'La conversación no existe.'],

  // Reportes y notificaciones
  [/reports of courses where you teach/i, 'Solo puedes generar reportes de los cursos donde dictas clase.'],
  [/This report is not available for your role/i, 'Ese reporte no está disponible para tu rol.'],
  [/You can only download your own reports/i, 'Solo puedes descargar los reportes que tú generaste.'],
  [/The report expired/i, 'El reporte ya venció (se guardan por tiempo limitado). Genéralo de nuevo.'],
  [/Only (teachers|students) can generate/i, 'Tu usuario no tiene un perfil asociado para generar reportes.'],
  [/This notification was already sent/i, 'Ese correo ya fue enviado; no hace falta reintentarlo.'],

  // No encontrado (va al final para no tapar los anteriores)
  [/not found/i, 'No se encontró el registro.']
];

export function translateMainApiMessage(message: string): string {
  return MESSAGES.find(([re]) => re.test(message))?.[1] ?? message;
}
