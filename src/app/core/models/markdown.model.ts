// Markdown ya interpretado (lo que escriben las IA: títulos, negritas, listas y tablas).
// Se pinta con plantillas de Angular, nunca con innerHTML: el texto de la IA no puede inyectar HTML.

/** Trozo de texto con su formato. */
export interface MdSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
}

/** Elemento de una lista; checked = casilla [ ] / [x] (null si no es lista de verificación). */
export interface MdListItem {
  spans: MdSpan[];
  checked: boolean | null;
}

export interface MdHeading { kind: 'heading'; level: 1 | 2 | 3 | 4; spans: MdSpan[]; }
export interface MdParagraph { kind: 'paragraph'; spans: MdSpan[]; }
export interface MdList { kind: 'list'; ordered: boolean; items: MdListItem[]; }
export interface MdTable { kind: 'table'; header: MdSpan[][]; rows: MdSpan[][][]; }
export interface MdRule { kind: 'rule'; }

/** Bloque de Markdown (unión discriminada por `kind`). */
export type MdBlock = MdHeading | MdParagraph | MdList | MdTable | MdRule;
