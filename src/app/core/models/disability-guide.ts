// Guía PIAR por discapacidad: ajustes razonables sugeridos y apoyos para que el estudiante pueda hacer sus actividades.
// Son orientaciones pedagógicas generales (no diagnóstico): el equipo docente las ajusta a cada estudiante.

export interface GuideArea {
  area: string;
  items: string[];
}

export interface DisabilityGuide {
  code: string;
  summary: string;
  areas: GuideArea[];            // ajustes razonables del PIAR, por área
  activityTips: string[];        // apoyos para realizar las actividades
  supportTypes: string[];        // tipos de apoyo visual recomendados (ver enum supportType)
}

export const DISABILITY_GUIDES: Record<string, DisabilityGuide> = {
  VISUAL: {
    code: 'VISUAL',
    summary: 'Accede a la información sin depender de la imagen: texto ampliado, contraste, descripción verbal o braille.',
    areas: [
      { area: 'Acceso a la información', items: ['Material con letra grande y alto contraste.', 'Describir en voz alta lo que se escribe o proyecta.', 'Entregar los textos en formato digital compatible con lector de pantalla.'] },
      { area: 'Metodología', items: ['Ubicarlo cerca del tablero y con buena iluminación.', 'Usar material táctil o concreto cuando sea posible.'] },
      { area: 'Evaluación', items: ['Tiempo adicional.', 'Evaluación oral o con texto ampliado.'] },
      { area: 'Entorno', items: ['Mantener los espacios ordenados y sin obstáculos.'] }
    ],
    activityTips: ['Pide el material ampliado o en digital antes de la clase.', 'Usa el lector de pantalla o una lupa para tus tareas.', 'Divide la actividad en partes y confirma cada una con tu docente.', 'Responde por escrito en computador o de forma oral si lo necesitas.'],
    supportTypes: ['RUTINA', 'ANTICIPACION']
  },
  HEARING: {
    code: 'HEARING',
    summary: 'Recibe la información por vía visual: gestos, lengua de señas, subtítulos y textos de apoyo.',
    areas: [
      { area: 'Comunicación', items: ['Hablar de frente, con buena luz y sin cubrirse la boca.', 'Apoyar lo oral con texto, imágenes y esquemas.', 'Intérprete o modelo lingüístico de lengua de señas si el estudiante lo usa.'] },
      { area: 'Metodología', items: ['Entregar por escrito las instrucciones y las tareas.', 'Subtitular los videos.'] },
      { area: 'Evaluación', items: ['Instrucciones escritas y claras.', 'Considerar la lengua de señas como primera lengua en la redacción.'] },
      { area: 'Entorno', items: ['Reducir el ruido de fondo y ubicarlo donde vea al docente y a sus compañeros.'] }
    ],
    activityTips: ['Pide las instrucciones por escrito.', 'Usa videos con subtítulos.', 'Confirma con tu docente que entendiste la tarea antes de empezar.', 'Trabaja con un compañero de apoyo en actividades en grupo.'],
    supportTypes: ['TAREA_PASOS', 'AGENDA_DIA']
  },
  INTELLECTUAL: {
    code: 'INTELLECTUAL',
    summary: 'Aprende mejor con instrucciones simples, ejemplos concretos, más tiempo y repetición.',
    areas: [
      { area: 'Metodología', items: ['Dividir la tarea en pasos cortos.', 'Usar ejemplos concretos y material manipulable.', 'Repasar lo aprendido con frecuencia.'] },
      { area: 'Comunicación', items: ['Lenguaje claro y oraciones cortas.', 'Verificar que comprendió antes de continuar.'] },
      { area: 'Evaluación', items: ['Pruebas más cortas y con apoyo visual.', 'Valorar el proceso y el avance individual.'] },
      { area: 'Contenidos', items: ['Priorizar los aprendizajes esenciales del grado.'] }
    ],
    activityTips: ['Haz una cosa a la vez, paso por paso.', 'Pide un ejemplo resuelto antes de empezar.', 'Usa tu apoyo visual con pictogramas.', 'Pide ayuda cuando no entiendas; es parte del proceso.'],
    supportTypes: ['TAREA_PASOS', 'RUTINA', 'AGENDA_DIA']
  },
  PHYSICAL: {
    code: 'PHYSICAL',
    summary: 'Participa en igualdad de condiciones con accesibilidad en el espacio, el mobiliario y los materiales.',
    areas: [
      { area: 'Entorno', items: ['Rutas accesibles y mobiliario adaptado.', 'Ubicación que facilite el desplazamiento.'] },
      { area: 'Metodología', items: ['Alternativas a la escritura manual: computador, dictado o plantillas.', 'Adaptar actividades físicas sin excluirlo.'] },
      { area: 'Evaluación', items: ['Tiempo adicional.', 'Formato de respuesta alternativo (oral, digital).'] },
      { area: 'Materiales', items: ['Agarres, atriles y materiales fáciles de manipular.'] }
    ],
    activityTips: ['Usa el computador o el dictado si escribir te cansa.', 'Pide tiempo extra y pausas.', 'Organiza tu espacio para alcanzar tus materiales.', 'Avisa si el lugar de la actividad no es accesible.'],
    supportTypes: ['RUTINA', 'AGENDA_DIA']
  },
  PSYCHOSOCIAL: {
    code: 'PSYCHOSOCIAL',
    summary: 'Necesita un ambiente predecible, tranquilo y de confianza, con acompañamiento emocional.',
    areas: [
      { area: 'Entorno', items: ['Rutinas estables y avisos de cambios.', 'Un espacio tranquilo disponible cuando lo necesite.'] },
      { area: 'Metodología', items: ['Tareas con metas pequeñas y reconocimiento de logros.', 'Evitar la exposición pública que lo incomode.'] },
      { area: 'Evaluación', items: ['Flexibilidad de fechas en momentos de crisis.', 'Reducir la presión de las pruebas con tiempos adicionales.'] },
      { area: 'Acompañamiento', items: ['Seguimiento con orientación escolar y la familia.'] }
    ],
    activityTips: ['Divide la tarea en metas pequeñas y celebra cada avance.', 'Avisa a tu docente si necesitas una pausa.', 'Mira tu agenda del día para saber qué viene.', 'Habla con orientación si te sientes abrumado.'],
    supportTypes: ['AGENDA_DIA', 'ANTICIPACION', 'NORMAS']
  },
  MULTIPLE: {
    code: 'MULTIPLE',
    summary: 'Combina apoyos de varias áreas; el PIAR se arma a la medida de cada estudiante.',
    areas: [
      { area: 'Valoración', items: ['Identificar con la familia y especialistas qué apoyos necesita en cada área.'] },
      { area: 'Metodología', items: ['Combinar apoyos visuales, táctiles y verbales.', 'Pasos cortos y apoyo de un adulto o compañero.'] },
      { area: 'Evaluación', items: ['Formato y tiempo ajustados a sus necesidades.'] },
      { area: 'Entorno', items: ['Accesibilidad física y rutinas predecibles.'] }
    ],
    activityTips: ['Usa todos tus apoyos: pictogramas, material adaptado y ayuda de tu docente.', 'Trabaja por pasos cortos.', 'Pide que te expliquen de más de una forma.', 'Descansa cuando lo necesites.'],
    supportTypes: ['TAREA_PASOS', 'RUTINA', 'AGENDA_DIA', 'ANTICIPACION']
  },
  DEAFBLIND: {
    code: 'DEAFBLIND',
    summary: 'Requiere comunicación táctil y apoyo de un mediador; la información llega por el tacto y el contexto.',
    areas: [
      { area: 'Comunicación', items: ['Sistema de comunicación táctil acordado (señas táctiles, braille, objetos de referencia).', 'Mediador o guía-intérprete.'] },
      { area: 'Entorno', items: ['Espacios constantes y ordenados; avisar antes de mover algo.'] },
      { area: 'Metodología', items: ['Anticipar cada actividad con objetos de referencia.', 'Más tiempo para explorar.'] },
      { area: 'Evaluación', items: ['Formato táctil o con mediador y tiempo adicional.'] }
    ],
    activityTips: ['Explora el material con tus manos antes de empezar.', 'Pide a tu mediador que te anticipe la actividad.', 'Usa tus objetos de referencia para cada materia.', 'Haz pausas cuando te canses.'],
    supportTypes: ['ANTICIPACION', 'RUTINA']
  },
  AUTISM: {
    code: 'AUTISM',
    summary: 'Se beneficia de la anticipación, las rutinas visuales, un lenguaje literal y un entorno con poca sobrecarga sensorial.',
    areas: [
      { area: 'Anticipación y rutinas', items: ['Agenda visual diaria con pictogramas.', 'Avisar con tiempo los cambios.', 'Anticipar actividades nuevas.'] },
      { area: 'Comunicación', items: ['Lenguaje claro, literal y directo.', 'Instrucciones cortas, de una en una.'] },
      { area: 'Entorno sensorial', items: ['Reducir ruido y estímulos fuertes.', 'Espacio de calma disponible.'] },
      { area: 'Evaluación', items: ['Preguntas claras y concretas.', 'Tiempo adicional y un lugar tranquilo.'] }
    ],
    activityTips: ['Mira tu agenda visual antes de empezar.', 'Haz la tarea paso a paso con tu lista de pictogramas.', 'Pide que te avisen si algo va a cambiar.', 'Usa tu espacio de calma si el ruido te molesta.'],
    supportTypes: ['AGENDA_DIA', 'RUTINA', 'ANTICIPACION', 'TAREA_PASOS', 'NORMAS']
  },
  ADHD: {
    code: 'ADHD',
    summary: 'Rinde mejor con instrucciones breves, pausas activas, pocas distracciones y retroalimentación inmediata.',
    areas: [
      { area: 'Metodología', items: ['Instrucciones cortas, una a la vez.', 'Tareas divididas en bloques con pausas activas.', 'Retroalimentación inmediata y refuerzo positivo.'] },
      { area: 'Entorno', items: ['Ubicarlo lejos de distractores y cerca del docente.', 'Material ordenado y visible.'] },
      { area: 'Organización', items: ['Agenda y listas de verificación.', 'Recordatorios de fechas de entrega.'] },
      { area: 'Evaluación', items: ['Tiempo adicional y espacio sin distracciones.', 'Pruebas divididas en partes.'] }
    ],
    activityTips: ['Usa una lista de pasos y tacha cada uno.', 'Trabaja en bloques cortos (por ejemplo 15 minutos) con una pausa.', 'Quita de tu mesa lo que no necesitas.', 'Pide al docente que revise tu avance a mitad de la tarea.'],
    supportTypes: ['TAREA_PASOS', 'AGENDA_DIA', 'NORMAS']
  },
  OTHER: {
    code: 'OTHER',
    summary: 'Los ajustes se definen según la condición específica del estudiante, con su familia y el equipo de apoyo.',
    areas: [
      { area: 'Valoración', items: ['Definir con la familia y especialistas las barreras y los apoyos necesarios.'] },
      { area: 'Metodología', items: ['Diversificar las formas de presentar y de responder las actividades.'] },
      { area: 'Evaluación', items: ['Ajustar tiempos y formatos según las necesidades.'] },
      { area: 'Seguimiento', items: ['Revisar el PIAR cada periodo.'] }
    ],
    activityTips: ['Cuenta a tu docente qué te ayuda más.', 'Divide las tareas en partes.', 'Pide más tiempo si lo necesitas.', 'Usa tus apoyos visuales.'],
    supportTypes: ['TAREA_PASOS', 'AGENDA_DIA']
  }
};

export function guideOf(code: string): DisabilityGuide {
  return DISABILITY_GUIDES[code] ?? DISABILITY_GUIDES['OTHER'];
}
