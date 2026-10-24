import { BackgroundPattern } from '../types/canvas';

export function renderBackgroundPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pattern: BackgroundPattern,
  isDark: boolean
) {
  // Clear canvas with background color
  ctx.save();
  ctx.fillStyle = isDark ? '#18181B' : '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  if (pattern === 'blank') {
    ctx.restore();
    return;
  }

  const lineColor = isDark ? '#2D3748' : '#E2E8F0';
  const marginColor = isDark ? '#4A5568' : '#FCA5A5'; // Subtle red margin in light mode
  const dotColor = isDark ? '#4A5568' : '#CBD5E1';

  ctx.lineWidth = 1;

  if (pattern === 'lined') {
    const lineSpacing = 40;
    const topMargin = 80;
    const leftMargin = 120;

    // Draw horizontal lines
    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    for (let y = topMargin; y < height; y += lineSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Draw left vertical notebook margin line
    ctx.strokeStyle = marginColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftMargin, 0);
    ctx.lineTo(leftMargin, height);
    ctx.stroke();
  } else if (pattern === 'grid') {
    const cellSize = 30;
    ctx.strokeStyle = lineColor;
    ctx.beginPath();

    // Vertical grid lines
    for (let x = 0; x <= width; x += cellSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    // Horizontal grid lines
    for (let y = 0; y <= height; y += cellSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (pattern === 'dotted') {
    const dotSpacing = 30;
    const dotRadius = 1.5;
    ctx.fillStyle = dotColor;

    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

