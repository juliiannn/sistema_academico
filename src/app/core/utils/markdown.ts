import { MdBlock, MdListItem, MdSpan } from '../models/markdown.model';

// Intérprete pequeño de Markdown para las respuestas de la IA. Soporta: títulos (#), párrafos, listas con viñetas,
// numeradas y de verificación ([ ] / [x]), tablas con |, líneas horizontales (---), **negrita**, *cursiva* y `código`.

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

/** Texto de una línea → trozos con formato. */
export function parseInline(text: string): MdSpan[] {
  const spans: MdSpan[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) {
      spans.push({ text: text.slice(last, index), bold: false, italic: false, code: false });
    }
    const token = match[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      // la negrita puede traer cursiva o código adentro: se interpreta y se marca todo en negrita
      parseInline(token.slice(2, -2)).forEach(s => spans.push({ ...s, bold: true }));
    } else if (token.startsWith('`')) {
      spans.push({ text: token.slice(1, -1), bold: false, italic: false, code: true });
    } else {
      spans.push({ text: token.slice(1, -1), bold: false, italic: true, code: false });
    }
    last = index + token.length;
  }
  if (last < text.length) {
    spans.push({ text: text.slice(last), bold: false, italic: false, code: false });
  }
  return spans;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const BULLET = /^\s*[-*+•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const CHECK = /^\[( |x|X)\]\s+(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function cells(row: string): MdSpan[][] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
    .map(c => parseInline(c.trim().replace(/\s*<br\s*\/?>\s*/gi, '\n')));
}

function listItem(text: string): MdListItem {
  const check = CHECK.exec(text);
  return check
    ? { spans: parseInline(check[2]), checked: check[1].toLowerCase() === 'x' }
    : { spans: parseInline(text), checked: null };
}

/** Texto completo → bloques. */
export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  // Las IA usan <br> para saltar de línea dentro de una celda: se vuelve un salto real (nunca se interpreta HTML)
  const br = (text: string) => text.replace(/<br\s*\/?>/gi, '\n');
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', spans: parseInline(br(paragraph.join(' '))) });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flush(); continue; }

    const heading = HEADING.exec(line.trim());
    if (heading) {
      flush();
      const level = Math.min(4, heading[1].length) as 1 | 2 | 3 | 4;
      blocks.push({ kind: 'heading', level, spans: parseInline(heading[2].replace(/\s#+\s*$/, '')) });
      continue;
    }
    if (RULE.test(line)) { flush(); blocks.push({ kind: 'rule' }); continue; }

    // Tabla: fila de títulos + separador |---|---|
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      flush();
      const header = cells(line);
      const rows: MdSpan[][][] = [];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }
      i--;
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      flush();
      const ordered = !bullet;
      const item = listItem((bullet ?? numbered)![1]);
      const previous = blocks[blocks.length - 1];
      if (previous && previous.kind === 'list' && previous.ordered === ordered) {
        previous.items.push(item);
      } else {
        blocks.push({ kind: 'list', ordered, items: [item] });
      }
      continue;
    }

    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}
