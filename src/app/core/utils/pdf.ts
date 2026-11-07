// Genera un PDF simple (texto, Helvetica) sin librerías externas.
export function buildPdf(lines: string[]): Blob {

  const perPage = 44;
  const pages: string[][] = [];

  for (let i = 0; i < Math.max(lines.length, 1); i += perPage) {
    pages.push(lines.slice(i, i + perPage));
  }

  // Solo caracteres Latin-1 (WinAnsi) y se escapan los especiales de PDF
  const clean = (s: string) =>
    s.replace(/[^\x20-\xFF]/g, '?')
     .replace(/\\/g, '\\\\')
     .replace(/\(/g, '\\(')
     .replace(/\)/g, '\\)');

  // Objetos: 1 catálogo, 2 páginas, 3 fuente, luego (página, contenido) por cada página
  const objs: string[] = [];
  const kids = pages.map((_, i) => `${4 + 2 * i} 0 R`).join(' ');

  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  pages.forEach((pageLines, i) => {
    const content =
      'BT /F1 11 Tf 50 790 Td 16 TL\n' +
      pageLines.map(line => `(${clean(line)}) Tj T*`).join('\n') +
      '\nET';

    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * i} 0 R >>`
    );
    objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objs.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xref = pdf.length;

  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);

  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 255;
  }

  return new Blob([bytes], { type: 'application/pdf' });
}
