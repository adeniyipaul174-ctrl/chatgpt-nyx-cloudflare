/** Create a small, dependency-free PDF with a basic Helvetica text layout. */
export function createTextPdf(title, body) {
  const clean = value => String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n\r\t]/g, '?')
    .replace(/[\r\t]/g, ' ')
    .split('')
    .map(char => (char === '(' || char === ')' || char === '\\') ? '\\' + char : char)
    .join('');
  const wrap = value => {
    const lines = [];
    for (const paragraph of value.replace(/\r/g, '').split('\n')) {
      if (!paragraph) { lines.push(''); continue; }
      let remaining = paragraph;
      while (remaining.length > 88) {
        let cut = remaining.lastIndexOf(' ', 88);
        if (cut < 35) cut = 88;
        lines.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut).trimStart();
      }
      lines.push(remaining);
    }
    return lines;
  };
  const lines = wrap(`${title}\n\n${body}`);
  const pages = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  const objects = [];
  const add = value => { objects.push(value); return objects.length; };
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  for (const pageLines of pages) {
    let stream = 'BT\n/F1 11 Tf\n50 790 Td\n14 TL\n';
    pageLines.forEach((line, index) => {
      if (index) stream += 'T*\n';
      stream += `(${clean(line)}) Tj\n`;
    });
    stream += 'ET';
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent PAGESREF /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  for (const id of pageIds) objects[id - 1] = objects[id - 1].replace('PAGESREF', `${pagesId} 0 R`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}
