import { jsPDF } from 'jspdf';
import { PageData } from '../types/notebook';
import { renderBackgroundPattern } from './renderGrid';
import { drawStroke } from './inking';
import { A4_WIDTH, A4_HEIGHT } from '../types/canvas';

export interface PDFExportOptions {
  includeBackground: boolean;
  isDark: boolean;
  pages: PageData[];
  title?: string;
}

export async function exportPagesToPDF(options: PDFExportOptions): Promise<void> {
  const { includeBackground, isDark, pages, title = 'Caderno de Estudos' } = options;
  if (pages.length === 0) return;

  // Standard A4 portrait in mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Offscreen canvas for rendering at high fidelity
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = A4_WIDTH;
  offscreenCanvas.height = A4_HEIGHT;
  const ctx = offscreenCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Falha ao obter contexto 2D para renderização de PDF');
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    if (i > 0) {
      doc.addPage('a4', 'portrait');
    }

    ctx.clearRect(0, 0, A4_WIDTH, A4_HEIGHT);

    // 1. Draw background pattern if selected
    if (includeBackground) {
      renderBackgroundPattern(ctx, A4_WIDTH, A4_HEIGHT, page.pattern, isDark);
    } else {
      ctx.fillStyle = isDark ? '#18181B' : '#FFFFFF';
      ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
    }

    // 2. Draw all strokes
    if (page.format === 'infinite' && page.strokes.length > 0) {
      // Calculate bounding box of all strokes in infinite canvas
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const s of page.strokes) {
        for (const p of s.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
      }

      const contentWidth = Math.max(maxX - minX, 100);
      const contentHeight = Math.max(maxY - minY, 100);
      const margin = 80;
      const availWidth = A4_WIDTH - margin * 2;
      const availHeight = A4_HEIGHT - margin * 2;

      // Fit content into A4 printable area
      const scale = Math.min(availWidth / contentWidth, availHeight / contentHeight, 1.0);
      const offsetX = margin + (availWidth - contentWidth * scale) / 2 - minX * scale;
      const offsetY = margin + (availHeight - contentHeight * scale) / 2 - minY * scale;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      for (const stroke of page.strokes) {
        drawStroke(ctx, stroke, 'normal', true);
      }
      ctx.restore();
    } else {
      // A4 format: direct 1:1 render
      for (const stroke of page.strokes) {
        drawStroke(ctx, stroke, 'normal', true);
      }
    }

    // 3. Compress and append page image to PDF
    const imgData = offscreenCanvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_caderno.pdf`;
  doc.save(filename);
}
