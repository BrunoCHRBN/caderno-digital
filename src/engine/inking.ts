import { getStroke } from 'perfect-freehand';
import { Stroke, StrokePoint, PressureCurve, ToolType } from '../types/canvas';

export function applyPressureCurve(pressure: number, curve: PressureCurve): number {
  if (pressure <= 0) return 0.1;
  if (pressure >= 1) return 1.0;

  switch (curve) {
    case 'soft':
      // Gamma < 1: reaches higher thickness with lighter touch
      return Math.pow(pressure, 0.65);
    case 'firm':
      // Gamma > 1: requires firmer touch to reach maximum thickness
      return Math.pow(pressure, 1.4);
    case 'normal':
    default:
      return pressure;
  }
}

export function getStrokePointsArray(
  points: StrokePoint[],
  curve: PressureCurve = 'normal'
): number[][] {
  return points.map((p) => [p.x, p.y, applyPressureCurve(p.pressure, curve)]);
}

export function getStrokeOutline(
  points: StrokePoint[],
  tool: ToolType,
  baseSize: number,
  curve: PressureCurve = 'normal',
  isComplete: boolean = true
): number[][] {
  if (points.length === 0) return [];

  const rawPoints = getStrokePointsArray(points, curve);
  const hasPressure = points.some((p) => p.pressure > 0 && p.pressure !== 0.5);

  const options = {
    size: tool === 'highlighter' ? baseSize * 4 : baseSize,
    thinning: tool === 'highlighter' ? 0.1 : 0.6,
    smoothing: 0.55,
    streamline: 0.5,
    simulatePressure: !hasPressure,
    last: isComplete,
  };

  return getStroke(rawPoints, options);
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  curve: PressureCurve = 'normal',
  isComplete: boolean = true
) {
  if (stroke.points.length === 0) return;

  const outline = getStrokeOutline(stroke.points, stroke.tool, stroke.size, curve, isComplete);
  if (outline.length === 0) return;

  ctx.save();

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = 0.45;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = 1.0;
  }

  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);

  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }

  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Checks if a point (e.g. from eraser) is close to any point in a stroke
 */
export function isPointNearStroke(
  point: { x: number; y: number },
  stroke: Stroke,
  threshold: number = 12
): boolean {
  const hitRadius = (stroke.size / 2) + threshold;
  const radiusSq = hitRadius * hitRadius;

  for (const p of stroke.points) {
    const dx = p.x - point.x;
    const dy = p.y - point.y;
    if (dx * dx + dy * dy <= radiusSq) {
      return true;
    }
  }

  return false;
}

