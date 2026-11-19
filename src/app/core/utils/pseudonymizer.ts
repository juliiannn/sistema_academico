// Cambia los nombres reales por códigos antes de enviar texto a la IA en la nube, y los devuelve al recibir
// la respuesta. Así el servicio externo nunca recibe la identidad de los estudiantes (menores de edad) ni de los docentes.
//   "Santiago Gómez Rincón" → "EST-71"      "Laura Patricia Gómez Rincón" → "DOC-5"

/** Persona que se debe ocultar. */
export interface PseudonymPerson {
  id: number;
  fullName: string;
  kind: 'EST' | 'DOC';
}

/** Una forma de escribir el nombre y su código. */
interface NameVariant {
  pattern: RegExp;
  code: string;
}

// Los modelos a veces escriben el código con otro guion (‑ – —) o con espacio: «EST‑71», «EST 71», «EST–71»
const CODE_PATTERN = /\b(EST|DOC)\s?[-\u2010-\u2015\u2212]?\s?(\d+)\b/g;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Coincide sin importar mayúsculas ni tildes ("Gomez" encuentra "Gómez"). */
function loosePattern(name: string): RegExp {
  const letters = escapeRegExp(name.normalize('NFC')).split('').map(ch => {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const groups: Record<string, string> = { a: 'aáàä', e: 'eéèë', i: 'iíìï', o: 'oóòö', u: 'uúùü', n: 'nñ' };
    const group = groups[base.toLowerCase()];
    return group ? `[${group}${group.toUpperCase()}]` : ch.replace(/\s/, '\\s+');
  }).join('');
  return new RegExp(`(?<![\\p{L}])${letters}(?![\\p{L}])`, 'giu');
}

export class Pseudonymizer {

  private readonly variants: NameVariant[] = [];
  private readonly names = new Map<string, string>();   // código → nombre real

  constructor(people: PseudonymPerson[]) {
    const key = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const candidates: { text: string; code: string; full: boolean }[] = [];

    for (const p of people) {
      const code = `${p.kind}-${p.id}`;
      const full = p.fullName.trim().replace(/\s+/g, ' ');
      if (!full) { continue; }
      this.names.set(code, full);
      const parts = full.split(' ');
      candidates.push({ text: full, code, full: true });
      // Formas cortas habituales: "Nombre Apellido", "Nombre1 Nombre2", "Nombre1 Nombre2 Apellido1"
      if (parts.length >= 3) {
        candidates.push({ text: `${parts[0]} ${parts[parts.length - 2]}`, code, full: false });
        candidates.push({ text: `${parts[0]} ${parts[1]}`, code, full: false });
      }
      if (parts.length >= 4) {
        candidates.push({ text: `${parts[0]} ${parts[1]} ${parts[2]}`, code, full: false });
        candidates.push({ text: `${parts[0]} ${parts[2]}`, code, full: false });
      }
    }

    // Una forma corta que comparten dos personas no se usa (no se sabría de quién se habla)
    const owners = new Map<string, Set<string>>();
    candidates.forEach(c => owners.set(key(c.text), (owners.get(key(c.text)) ?? new Set<string>()).add(c.code)));
    const used = new Set<string>();
    for (const c of candidates) {
      const k = key(c.text);
      if ((c.full || owners.get(k)?.size === 1) && !used.has(k)) {
        used.add(k);
        this.variants.push({ pattern: loosePattern(c.text), code: c.code });
      }
    }
    // Primero los nombres más largos ("Laura Patricia Gómez Rincón" antes que "Laura Gómez")
    this.variants.sort((x, y) => y.pattern.source.length - x.pattern.source.length);
  }

  /** Texto con los nombres cambiados por códigos. */
  mask(text: string): string {
    let out = text;
    for (const v of this.variants) {
      out = out.replace(v.pattern, v.code);
    }
    return out;
  }

  /** Texto con los códigos cambiados de nuevo por los nombres reales. */
  unmask(text: string): string {
    return text.replace(CODE_PATTERN, (match: string, kind: string, id: string) => this.names.get(`${kind}-${id}`) ?? match);
  }
}
