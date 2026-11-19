// Orden natural de los grados del colegio: Párvulo, Prejardín, Jardín, Transición, Primero ... Undécimo.
// Las listas (cursos, "Curso · Materia", filtros) se ordenan con esto en vez de alfabéticamente,
// porque alfabéticamente quedaría "Cuarto, Décimo, Jardín, Noveno...".
const GRADES = ['parvulo', 'prejardin', 'jardin', 'transicion', 'primero', 'segundo', 'tercero', 'cuarto',
  'quinto', 'sexto', 'septimo', 'octavo', 'noveno', 'decimo', 'undecimo'];
const ALIASES: Record<string, string> = { once: 'undecimo' };

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Posición del grado con que empieza el texto (−1 si no empieza con un grado). */
export function gradeRank(label: string): number {
  const text = plain(label).replace(/^pre[\s-]+jardin/, 'prejardin');
  const first = text.split(/[\s·,-]+/)[0];
  return GRADES.indexOf(ALIASES[first] ?? first);
}

/** Compara dos textos: primero por grado (si ambos empiezan con uno) y luego alfabéticamente. */
export function compareLabels(a: string, b: string): number {
  const ra = gradeRank(a);
  const rb = gradeRank(b);
  if (ra !== -1 && rb !== -1 && ra !== rb) {
    return ra - rb;
  }
  if (ra !== rb && (ra === -1 || rb === -1)) {
    return ra === -1 ? 1 : -1;   // los grados conocidos van primero
  }
  return a.localeCompare(b, 'es', { numeric: true });
}
