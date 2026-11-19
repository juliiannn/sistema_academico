// Guía corta de ajustes razonables por tipo de discapacidad (Decreto 1421 de 2017).
// Se envía a la IA SOLO la guía de las discapacidades de la pregunta, para que no mezcle estrategias
// (por ejemplo "horario visual" para un estudiante ciego) y para no alargar el mensaje.

/** Códigos del enum disability (ver ENUM_LABELS.disability). */
export type Disability =
  | 'VISUAL' | 'HEARING' | 'INTELLECTUAL' | 'PHYSICAL' | 'PSYCHOSOCIAL' | 'MULTIPLE' | 'DEAFBLIND' | 'AUTISM' | 'ADHD' | 'OTHER';

/** Guía de una discapacidad: qué sí aplica y qué evitar. */
export interface DisabilityGuide {
  code: Disability;
  keywords: RegExp;
  guide: string;
}

export const DISABILITY_GUIDES: DisabilityGuide[] = [
  {
    code: 'VISUAL', keywords: /visual|ciego|ceguera|baja vision|invidente/,
    guide: 'Discapacidad visual: distinguir baja visión (ampliación, alto contraste, buena luz sin reflejos, ubicar al estudiante cerca del tablero, lupa o magnificador) de ceguera (braille, material en relieve y táctil, audio, lector de pantalla como NVDA). Verbalizar todo lo que se escribe o muestra; gráficas, mapas y diagramas en relieve; calculadora parlante; material digital accesible entregado antes de clase; tiempo extra y evaluación oral o en formato ampliado; orientación y movilidad; compañero tutor en laboratorios. Evitar depender de imágenes, videos o colores sin descripción.'
  },
  {
    code: 'HEARING', keywords: /auditiv|sord|hipoacus|lengua de senas/,
    guide: 'Discapacidad auditiva: intérprete o modelo lingüístico de Lengua de Señas Colombiana cuando aplique; ubicar al estudiante con visión directa del docente y del intérprete; hablar de frente sin tapar la boca; apoyo visual (esquemas, subtítulos, instrucciones escritas); verificar comprensión; español escrito como segunda lengua para usuarios de LSC; evaluar con apoyos visuales. Evitar instrucciones solo orales o dictados.'
  },
  {
    code: 'INTELLECTUAL', keywords: /intelectual|cognitiv|sindrome de down/,
    guide: 'Discapacidad intelectual: flexibilizar logros a lo esencial del grado; instrucciones cortas y paso a paso; material concreto y ejemplos de la vida diaria; apoyos visuales; más práctica y repetición; evaluar procesos y avances frente a sí mismo, con formatos simples; trabajo cooperativo con roles claros. Evitar exceso de abstracción y tareas largas sin pausas.'
  },
  {
    code: 'PHYSICAL', keywords: /fisic|motor|movilidad|silla de ruedas|paralisis/,
    guide: 'Discapacidad física: accesibilidad del aula y del recorrido; mobiliario adaptado; tiempo extra para escribir o desplazarse; alternativas a la escritura manual (computador, dictado, respuestas orales); adaptar educación física y laboratorios; evaluar el aprendizaje sin depender de la destreza motriz.'
  },
  {
    code: 'PSYCHOSOCIAL', keywords: /psicosocial|ansiedad|depresi|emocional/,
    guide: 'Discapacidad psicosocial: ambiente predecible y seguro; anticipar cambios; acuerdos de aula y espacio para regularse; flexibilizar fechas en crisis; articulación con orientación escolar, familia y salud; retroalimentación positiva. Evitar exponer al estudiante frente al grupo.'
  },
  {
    code: 'AUTISM', keywords: /autis|\btea\b|asperger/,
    guide: 'Trastorno del espectro autista (TEA): rutinas y horario visual; anticipar cambios; instrucciones concretas y literales; apoyos visuales y pictogramas; reducir estímulos sensoriales (ruido, luz); espacio de calma; aprovechar sus intereses; enseñar habilidades sociales de forma explícita; evaluación con formato claro y tiempo extra.'
  },
  {
    code: 'ADHD', keywords: /tdah|deficit de atencion|hiperactiv/,
    guide: 'TDAH: ubicar lejos de distractores y cerca del docente; dividir tareas en partes cortas con metas visibles; pausas activas; instrucciones breves y por escrito; agenda o lista de chequeo; refuerzo positivo inmediato; evaluaciones fraccionadas con tiempo extra; permitir movimiento controlado.'
  },
  {
    code: 'DEAFBLIND', keywords: /sordoceg/,
    guide: 'Sordoceguera: guía-intérprete; comunicación táctil (lengua de señas táctil, braille); objetos de referencia y rutinas muy estables; material táctil; ritmo pausado; trabajo con la familia y especialistas.'
  },
  {
    code: 'MULTIPLE', keywords: /multiple|multidiscapacidad/,
    guide: 'Discapacidad múltiple: combinar los ajustes de cada condición según la valoración pedagógica; priorizar comunicación y autonomía; equipo de apoyo (docente de apoyo, familia, salud); metas funcionales y concretas.'
  }
];

/** Guías que corresponden a la pregunta (por palabras) y a los estudiantes nombrados (por su PIAR). */
export function guidesFor(normalizedQuestion: string, disabilities: Iterable<string | null | undefined>): string[] {
  const codes = new Set<string>();
  for (const d of disabilities) {
    if (d) { codes.add(d); }
  }
  DISABILITY_GUIDES.forEach(g => { if (g.keywords.test(normalizedQuestion)) { codes.add(g.code); } });
  return DISABILITY_GUIDES.filter(g => codes.has(g.code)).map(g => g.guide);
}
