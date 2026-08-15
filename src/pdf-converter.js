const fs = require('fs');
const path = require('path');

let pdfjsLib = null;

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLib;
}

/**
 * Converts a PDF buffer or file path to high-fidelity Markdown.
 * @param {Buffer|Uint8Array} fileBuffer
 * @param {string} title
 * @returns {Promise<{markdown: string, pageCount: number}>}
 */
async function convertPdfBufferToMarkdown(fileBuffer, title = 'Documento') {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(fileBuffer);
  
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false
  });

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  const fontSizes = [];
  const pagesData = [];

  // 1. Extraer datos estructurados de cada página
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent({ normalizeWhitespace: true });
    
    const pageItems = [];

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim().length > 0) {
        const fontSize = Math.round(Math.abs(item.transform[3] || item.transform[0])) || 12;
        const fontName = (item.fontName || '').toLowerCase();
        const isBold = fontName.includes('bold') || fontName.includes('black') || fontName.includes('heavy') || fontName.includes('semibold');
        const isItalic = fontName.includes('italic') || fontName.includes('oblique');
        const isMono = fontName.includes('mono') || fontName.includes('courier') || fontName.includes('consolas') || fontName.includes('code');

        fontSizes.push(fontSize);

        pageItems.push({
          text: item.str,
          fontSize,
          isBold,
          isItalic,
          isMono,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || fontSize
        });
      }
    }

    pagesData.push(pageItems);
  }

  if (fontSizes.length === 0) {
    return {
      markdown: `# ${title}\n\n> ⚠️ *El PDF no contiene texto digital legible (puede tratarse de un PDF escaneado basado únicamente en imágenes).*`,
      pageCount
    };
  }

  // 2. Calcular tamaño de fuente base (mediana)
  fontSizes.sort((a, b) => a - b);
  const baseFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

  const documentMarkdownLines = [];
  documentMarkdownLines.push(`# ${title}`);
  documentMarkdownLines.push(`> 📄 *Documento PDF (${pageCount} ${pageCount === 1 ? 'página' : 'páginas'})*\n`);

  // 3. Procesar página por página
  for (let pIdx = 0; pIdx < pagesData.length; pIdx++) {
    const items = pagesData[pIdx];
    if (items.length === 0) continue;

    if (pIdx > 0) {
      documentMarkdownLines.push('\n---\n');
    }

    // Ordenar elementos: Y descendente (arriba -> abajo), X ascendente (izquierda -> derecha)
    // Tolerancia en Y para agrupar en la misma línea visual
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 3) {
        return yDiff;
      }
      return a.x - b.x;
    });

    // Agrupar ítems en líneas visuales
    const visualLines = [];
    let currentLine = [];
    let currentLineY = items[0].y;

    for (const item of items) {
      if (Math.abs(item.y - currentLineY) > 3.5) {
        if (currentLine.length > 0) {
          // Ordenar ítems de la línea por X
          currentLine.sort((a, b) => a.x - b.x);
          visualLines.push(currentLine);
        }
        currentLine = [item];
        currentLineY = item.y;
      } else {
        currentLine.push(item);
      }
    }
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x);
      visualLines.push(currentLine);
    }

    // Procesar líneas agrupadas a Markdown
    let inTable = false;
    let tableBuffer = [];
    let inCodeBlock = false;
    let codeBuffer = [];
    let paragraphBuffer = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        documentMarkdownLines.push(paragraphBuffer.join(' '));
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (inCodeBlock && codeBuffer.length > 0) {
        documentMarkdownLines.push('```\n' + codeBuffer.join('\n') + '\n```\n');
        codeBuffer = [];
        inCodeBlock = false;
      }
    };

    const flushTable = () => {
      if (inTable && tableBuffer.length > 0) {
        // Normalizar número de columnas
        const maxCols = Math.max(...tableBuffer.map(row => row.length));
        if (maxCols >= 2) {
          const header = tableBuffer[0];
          while (header.length < maxCols) header.push('');
          documentMarkdownLines.push('\n| ' + header.join(' | ') + ' |');
          documentMarkdownLines.push('| ' + header.map(() => '---').join(' | ') + ' |');

          for (let r = 1; r < tableBuffer.length; r++) {
            const row = tableBuffer[r];
            while (row.length < maxCols) row.push('');
            documentMarkdownLines.push('| ' + row.join(' | ') + ' |');
          }
          documentMarkdownLines.push('');
        } else {
          // Si era 1 sola columna, emitir como párrafos
          tableBuffer.forEach(row => documentMarkdownLines.push(row.join(' ')));
        }
        tableBuffer = [];
        inTable = false;
      }
    };

    for (let lIdx = 0; lIdx < visualLines.length; lIdx++) {
      const lineItems = visualLines[lIdx];
      
      // Calcular propiedades promedio de la línea
      const totalLen = lineItems.reduce((acc, it) => acc + it.text.length, 0);
      const maxFontSize = Math.max(...lineItems.map(it => it.fontSize));
      const allBold = lineItems.every(it => it.isBold || !it.text.trim());
      const allMono = lineItems.every(it => it.isMono || !it.text.trim());

      // Detectar si la línea contiene columnas tabulares por separación en X
      const columns = [];
      let currentCell = [lineItems[0]];
      
      for (let i = 1; i < lineItems.length; i++) {
        const prev = lineItems[i - 1];
        const curr = lineItems[i];
        const gap = curr.x - (prev.x + prev.width);
        
        // Espacio horizontal significativo (> 25px) indica separación de columnas
        if (gap > 25 && prev.text.trim().length > 0) {
          columns.push(currentCell);
          currentCell = [curr];
        } else {
          currentCell.push(curr);
        }
      }
      columns.push(currentCell);

      const isTableRow = columns.length >= 2;

      if (isTableRow) {
        flushParagraph();
        flushCodeBlock();
        inTable = true;
        const rowCells = columns.map(colItems => {
          return colItems.map(it => it.text.trim()).join(' ').replace(/\|/g, '\\|');
        });
        tableBuffer.push(rowCells);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Reconstruir texto con formato inline
      let lineText = '';
      for (let i = 0; i < lineItems.length; i++) {
        const it = lineItems[i];
        let t = it.text;
        
        // Agregar espacio si es necesario según coordenadas
        if (i > 0) {
          const prev = lineItems[i - 1];
          const gap = it.x - (prev.x + prev.width);
          if (gap > 2 && !lineText.endsWith(' ') && !t.startsWith(' ')) {
            lineText += ' ';
          }
        }

        // Inline formatting si no toda la línea es bold/mono
        if (it.isMono && !allMono && t.trim().length > 0) {
          t = `\`${t.trim()}\``;
        } else if (it.isBold && !allBold && t.trim().length > 0) {
          t = `**${t.trim()}**`;
        } else if (it.isItalic && t.trim().length > 0) {
          t = `*${t.trim()}*`;
        }

        lineText += t;
      }

      const trimmedLine = lineText.trim();
      if (!trimmedLine) {
        flushParagraph();
        flushCodeBlock();
        continue;
      }

      // Detectar Bloques de Código
      if (allMono && trimmedLine.length > 2) {
        flushParagraph();
        if (!inCodeBlock) inCodeBlock = true;
        codeBuffer.push(lineItems.map(it => it.text).join(''));
        continue;
      } else if (inCodeBlock) {
        flushCodeBlock();
      }

      // Clasificación de Encabezados por Escala Tipográfica
      if (maxFontSize >= baseFontSize * 1.55) {
        flushParagraph();
        documentMarkdownLines.push(`\n# ${trimmedLine.replace(/^#+\s*/, '')}\n`);
        continue;
      } else if (maxFontSize >= baseFontSize * 1.28) {
        flushParagraph();
        documentMarkdownLines.push(`\n## ${trimmedLine.replace(/^#+\s*/, '')}\n`);
        continue;
      } else if (maxFontSize >= baseFontSize * 1.12 && (allBold || trimmedLine.length < 90)) {
        flushParagraph();
        documentMarkdownLines.push(`\n### ${trimmedLine.replace(/^#+\s*/, '')}\n`);
        continue;
      }

      // Viñetas y Listas
      if (trimmedLine.match(/^[\u2022\u2023\u25E6\u2043\u2219\-\*▪➢]\s+/)) {
        flushParagraph();
        const cleanList = trimmedLine.replace(/^[\u2022\u2023\u25E6\u2043\u2219\-\*▪➢]\s+/, '- ');
        documentMarkdownLines.push(cleanList);
        continue;
      }

      // Listas Numeradas (1., 1.1, a), etc.)
      if (trimmedLine.match(/^(\d+[\.\)]|[a-zA-Z][\.\)]|\d+\.\d+)\s+/)) {
        flushParagraph();
        documentMarkdownLines.push(trimmedLine);
        continue;
      }

      // Casillas de verificación
      if (trimmedLine.match(/^\[[ xX]\]\s+/)) {
        flushParagraph();
        documentMarkdownLines.push(`- ${trimmedLine}`);
        continue;
      }

      // Claves/Valores (ej. "Fecha: 2026-08-15")
      if (trimmedLine.match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,30}):\s+(.+)$/)) {
        flushParagraph();
        documentMarkdownLines.push(trimmedLine.replace(/^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,30}):\s+(.+)$/, '**$1:** $2'));
        continue;
      }

      // Líneas completamente en negrita cortas (subtítulo o énfasis destacado)
      if (allBold && trimmedLine.length < 80 && !trimmedLine.endsWith('.')) {
        flushParagraph();
        documentMarkdownLines.push(`\n**${trimmedLine}**\n`);
        continue;
      }

      // Acumular a párrafo fluido
      paragraphBuffer.push(trimmedLine);
    }

    flushParagraph();
    flushCodeBlock();
    flushTable();
  }

  return {
    markdown: documentMarkdownLines.join('\n'),
    pageCount
  };
}

/**
 * Read PDF file directly from path and convert to Markdown.
 * @param {string} filePath
 */
async function parsePdfFileToMarkdown(filePath) {
  const pdfBuffer = fs.readFileSync(filePath);
  const title = path.basename(filePath, path.extname(filePath));
  const { markdown, pageCount } = await convertPdfBufferToMarkdown(pdfBuffer, title);
  
  return {
    filePath: null, // Allow save as new MD
    fileName: `${title}.md`,
    content: markdown,
    isPdf: true,
    pageCount
  };
}

module.exports = {
  convertPdfBufferToMarkdown,
  parsePdfFileToMarkdown
};
