import { ENUM_LABELS } from '../models/enums';
import { Piar, PiarWithDisability, SpecialNeed } from '../models/piar.model';

// En la base de datos el PIAR guarda sus necesidades (tabla piar_needs → catálogo special_needs).
// El frontend muestra el "tipo de discapacidad": es la necesidad cuyo nombre coincide con la etiqueta del enum disability.

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Código de discapacidad (VISUAL, AUTISM...) a partir del nombre de la necesidad educativa. */
export function disabilityCodeOf(needName: string | null | undefined): string {
  const name = normalize(needName ?? '');
  const entry = Object.entries(ENUM_LABELS['disability']).find(([, label]) => normalize(label) === name);
  return entry ? entry[0] : 'OTHER';
}

/** Agrega a cada PIAR el campo disability (primera necesidad activa) para tablas y guías. */
export function withDisability(piars: Piar[]): PiarWithDisability[] {
  return piars.map(p => {
    const needs = Array.isArray(p.needs) ? p.needs : [];
    return {
      ...p,
      disability: needs.length ? disabilityCodeOf(needs[0].nombre) : 'OTHER',
      necesidades: needs.map(n => n.nombre).join(', ')
    };
  });
}

/** Id de la necesidad educativa del catálogo que corresponde a un código de discapacidad. */
export function specialNeedIdFor(code: string, catalog: SpecialNeed[]): number {
  const label = normalize(ENUM_LABELS['disability'][code] ?? '');
  const found = catalog.find(n => normalize(n.nombre) === label);
  if (!found) {
    throw new Error('Esa discapacidad no está en el catálogo de Necesidades educativas. Agrégala primero en ese módulo.');
  }
  return found.id;
}
