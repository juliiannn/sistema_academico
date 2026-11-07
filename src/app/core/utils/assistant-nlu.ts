// Utilidades de lenguaje natural para el asistente (reglas en español, sin servicios externos de IA).

export type Intent =
  | 'help' | 'piar' | 'supports' | 'grades' | 'attendance' | 'schedule'
  | 'assignments' | 'enrollments' | 'teaching' | 'entities' | 'unknown';

// Minúsculas, sin tildes ni signos: "¿Cuántos Estudiántes?" -> "cuantos estudiantes"
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INTENT_RULES: [Intent, RegExp][] = [
  ['help', /\b(ayuda|que puedes|que sabes|como funciona|ejemplos?)\b/],
  ['piar', /\b(piar|discapacidad\w*|inclusion|autis\w*|tea|tdah|sordoceguera|visual|auditiv\w*|intelectual|psicosocial|ceguera|sordera|hiperactiv\w*)\b/],
  ['supports', /\b(apoyos?|pictogramas?|agenda|rutinas?|anticipacion|normas)\b/],
  ['grades', /\b(notas?|calificaci\w+|promedio|rendimiento|desempeno)\b/],
  ['attendance', /\b(asistencia|ausen\w+|inasistencias?|faltas?|llegadas? tarde|tardanzas?)\b/],
  ['schedule', /\b(horarios?|clases?)\b/],
  ['assignments', /\b(actividades|actividad|tareas?|entregas?|talleres?)\b/],
  ['enrollments', /\b(matricul\w+|inscrit\w+)\b/],
  ['teaching', /\b(dicta|dictan|imparte|asignad\w+|asignacion\w*|materias? de|que ensena)\b/],
  ['entities', /\b(estudiantes?|alumnos?|docentes?|profesores?|coordinadores?|rectores?|rector|cursos?|materias?|usuarios?|cuantos|cuantas|lista|listado|muestrame)\b/]
];

export function detectIntent(question: string): Intent {
  const q = normalize(question);
  return INTENT_RULES.find(([, re]) => re.test(q))?.[0] ?? 'unknown';
}

// Palabra clave -> código de discapacidad (ver ENUM_LABELS.disability)
const DISABILITY_WORDS: [RegExp, string][] = [
  [/\b(autis\w*|tea)\b/, 'AUTISM'],
  [/\btdah\b|\bdeficit de atencion\b|\bhiperactiv\w*/, 'ADHD'],
  [/\bsordoceguera\b/, 'DEAFBLIND'],
  [/\bvisual\b|\bceguera\b|\bciego\w*/, 'VISUAL'],
  [/\bauditiv\w*|\bsordera\b|\bsordo\w*/, 'HEARING'],
  [/\bintelectual\b|\bcognitiv\w*/, 'INTELLECTUAL'],
  [/\bfisica\b|\bmotriz\b|\bmotora\b/, 'PHYSICAL'],
  [/\bpsicosocial\b/, 'PSYCHOSOCIAL'],
  [/\bmultiple\b/, 'MULTIPLE']
];

export function detectDisability(question: string): string | null {
  const q = normalize(question);
  return DISABILITY_WORDS.find(([re]) => re.test(q))?.[1] ?? null;
}

export function detectPeriod(question: string): string | null {
  const q = normalize(question);
  const m = q.match(/\bperiodo\s*([1-4])\b/) ?? q.match(/\b([1-4])\s*(?:er|do|ro|to)?\s*periodo\b/);
  return m ? `PERIOD_${m[1]}` : null;
}

export function detectDay(question: string): string | null {
  const q = normalize(question);
  const days: [string, string][] = [
    ['lunes', 'MONDAY'], ['martes', 'TUESDAY'], ['miercoles', 'WEDNESDAY'], ['jueves', 'THURSDAY'], ['viernes', 'FRIDAY']
  ];
  return days.find(([word]) => q.includes(word))?.[1] ?? null;
}

// ¿La pregunta se refiere a algo mencionado antes? ("y sus notas?", "¿y de ese curso?")
export function refersToPrevious(question: string): boolean {
  const q = normalize(question);
  return /^y\b/.test(q) || /\b(su|sus|ella|ese estudiante|esa persona|ese curso|el mismo|la misma)\b/.test(q);
}

// Busca una persona cuyo nombre aparezca en la pregunta (nombre completo, o nombre + apellido, o solo el apellido/nombre si es único)
export function findPersonByName<T extends { fullName?: unknown }>(question: string, people: T[]): T | null {

  const q = ' ' + normalize(question) + ' ';
  const named = people.map(p => ({ p, name: normalize(String(p.fullName ?? '')) })).filter(x => x.name);

  const full = named.find(x => q.includes(' ' + x.name + ' '));
  if (full) {
    return full.p;
  }

  // Coincidencia por palabras (ignora palabras cortas como "de")
  const qWords = new Set(q.split(' ').filter(w => w.length > 2));
  const scored = named
    .map(x => ({ p: x.p, hits: x.name.split(' ').filter(w => w.length > 2 && qWords.has(w)).length }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  if (scored.length === 0) {
    return null;
  }

  // Si dos personas empatan en el mejor puntaje la pregunta es ambigua
  if (scored.length > 1 && scored[0].hits === scored[1].hits) {
    return null;
  }

  return scored[0].p;
}

// Busca un curso por nombre ("10-a", "10 a", "décimo a")
export function findCourse<T extends { name?: unknown }>(question: string, courses: T[]): T | null {
  const q = normalize(question).replace(/(\d+)\s*-?\s*([a-z])\b/g, '$1-$2');
  return courses.find(c => q.includes(normalize(String(c.name ?? '')).replace(/\s+/g, ''))
    || q.split(' ').includes(normalize(String(c.name ?? '')))) ?? null;
}

export function findByName<T extends { name?: unknown }>(question: string, items: T[]): T | null {
  const q = normalize(question);
  return items.find(i => {
    const n = normalize(String(i.name ?? ''));
    return n.length > 2 && q.includes(n);
  }) ?? null;
}
