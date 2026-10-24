import { StrokePoint } from '../types/canvas';

export type DetectedShapeType = 'line' | 'arrow' | 'circle' | 'rectangle' | 'triangle' | 'none';

export interface RecognizedShape {
  type: DetectedShapeType;
  points: StrokePoint[];
  label: string;
}

// Distance between two points
export function dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Total length of a path
export function pathLength(points: StrokePoint[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += dist(points[i], points[i + 1]);
  }
  return len;
}

// Remove micro-jitter points (points within 2.0px of previous point)
export function cleanJitter(points: StrokePoint[]): StrokePoint[] {
  if (points.length <= 2) return points;
  const cleaned: StrokePoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (dist(points[i], cleaned[cleaned.length - 1]) >= 2.0) {
      cleaned.push(points[i]);
    }
  }
  if (cleaned.length < 2) {
    cleaned.push(points[points.length - 1]);
  }
  return cleaned;
}

// Shoelace formula for polygon area
function computePolygonArea(points: StrokePoint[]): number {
  let area = 0;
  const n = points.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

// Perpendicular distance from point P to line segment (A, B)
export function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const l2 = Math.pow(dist(a, b), 2);
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

// Ramer-Douglas-Peucker simplification
function ramerDouglasPeucker(points: StrokePoint[], epsilon: number): StrokePoint[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = distToSegment(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = ramerDouglasPeucker(points.slice(index), epsilon);
    return recResults1.slice(0, -1).concat(recResults2);
  } else {
    return [points[0], points[end]];
  }
}

// Detect sharp corners on closed loop using Ramer-Douglas-Peucker
function findClosedLoopCorners(rawPoints: StrokePoint[], diagonal: number): StrokePoint[] {
  let maxD = 0;
  let maxIdx = Math.floor(rawPoints.length / 2);

  for (let i = 1; i < rawPoints.length; i++) {
    const d = dist(rawPoints[0], rawPoints[i]);
    if (d > maxD) {
      maxD = d;
      maxIdx = i;
    }
  }

  const epsilon = Math.max(6, diagonal * 0.06);
  const half1 = ramerDouglasPeucker(rawPoints.slice(0, maxIdx + 1), epsilon);
  const half2 = ramerDouglasPeucker(rawPoints.slice(maxIdx), epsilon);

  const combined = half1.slice(0, -1).concat(half2);

  const corners: StrokePoint[] = [];
  const n = combined.length;
  for (let i = 0; i < n; i++) {
    const prev = combined[(i - 1 + n) % n];
    const curr = combined[i];
    const next = combined[(i + 1) % n];

    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const d1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y) || 1;
    const d2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y) || 1;
    const cosAngle = (v1.x * v2.x + v1.y * v2.y) / (d1 * d2);
    const angleDeg = (Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI;

    // Corner with noticeable direction change
    if (angleDeg < 145 && d1 > 8 && d2 > 8) {
      corners.push(curr);
    }
  }

  return corners;
}

/**
 * Recognizes geometric shape from raw drawn stroke points.
 * Returns the detected shape type and the sanitized/straightened points.
 */
export function recognizeShape(rawPoints: StrokePoint[]): RecognizedShape {
  if (rawPoints.length < 4) {
    return { type: 'none', points: rawPoints, label: '' };
  }

  const points = cleanJitter(rawPoints);
  if (points.length < 3) {
    return { type: 'none', points: rawPoints, label: '' };
  }

  const start = points[0];
  const end = points[points.length - 1];
  const totalLen = pathLength(points);
  const directDist = dist(start, end);
  const avgPressure =
    points.reduce((acc, p) => acc + p.pressure, 0) / points.length;

  // Compute maximum perpendicular deviation from start-to-end chord
  let maxDev = 0;
  for (const p of points) {
    const d = distToSegment(p, start, end);
    if (d > maxDev) maxDev = d;
  }

  const lineRatio = directDist / (totalLen || 1);

  // Check if stroke forms a closed loop:
  // Either start and end are close (< 35px), or direct distance is small relative to total path
  const isClosed = (directDist < 35 || lineRatio < 0.32) && totalLen > 40;

  // 1. CLOSED LOOP DETECTION (Triangle, Circle, Rectangle, Square)
  if (isClosed) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let sumX = 0,
      sumY = 0;

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      sumX += p.x;
      sumY += p.y;
    }

    const count = points.length;
    const cx = sumX / count;
    const cy = sumY / count;
    const boxW = Math.max(maxX - minX, 10);
    const boxH = Math.max(maxY - minY, 10);
    const boxArea = boxW * boxH;
    const diagonal = Math.sqrt(boxW * boxW + boxH * boxH);

    const polyArea = computePolygonArea(points);
    const fillRatio = polyArea / (boxArea || 1);
    const circularity = (4 * Math.PI * polyArea) / (Math.pow(totalLen, 2) || 1);

    const corners = findClosedLoopCorners(points, diagonal);

    // A. TRIANGLE CHECK:
    // A triangle has 3 corners OR low fill ratio (area of triangle is ~ half of bounding box)
    if (corners.length === 3 || (fillRatio < 0.65 && corners.length <= 4 && circularity < 0.72)) {
      let triVertices: StrokePoint[] = [];

      if (corners.length === 3) {
        triVertices = corners;
      } else {
        // Find 3 most dominant extremal points
        const sortedByY = [...points].sort((a, b) => a.y - b.y);
        const topVertex = sortedByY[0];
        const sortedByX = [...points].sort((a, b) => a.x - b.x);
        const leftVertex = sortedByX[0];
        const rightVertex = sortedByX[sortedByX.length - 1];

        triVertices = [topVertex, rightVertex, leftVertex];
      }

      const smoothTriangle: StrokePoint[] = [];
      const vCount = triVertices.length;
      for (let i = 0; i < vCount; i++) {
        const p1 = triVertices[i];
        const p2 = triVertices[(i + 1) % vCount];
        for (let t = 0; t <= 8; t++) {
          const factor = t / 8;
          smoothTriangle.push({
            x: p1.x + (p2.x - p1.x) * factor,
            y: p1.y + (p2.y - p1.y) * factor,
            pressure: avgPressure,
            time: Date.now(),
          });
        }
      }

      return {
        type: 'triangle',
        points: smoothTriangle,
        label: 'Triângulo',
      };
    }

    // B. CIRCLE / ELLIPSE CHECK:
    // A circle has high circularity (> 0.70) and FEW or NO sharp corners (< 3)
    if (circularity >= 0.70 && corners.length < 3) {
      const isSquareRatio = Math.abs(boxW - boxH) / Math.max(boxW, boxH) < 0.22;
      const rx = isSquareRatio ? (boxW + boxH) / 4 : boxW / 2;
      const ry = isSquareRatio ? (boxW + boxH) / 4 : boxH / 2;

      const circlePoints: StrokePoint[] = [];
      const numSegments = 40;
      for (let i = 0; i <= numSegments; i++) {
        const theta = (i / numSegments) * Math.PI * 2;
        circlePoints.push({
          x: cx + Math.cos(theta) * rx,
          y: cy + Math.sin(theta) * ry,
          pressure: avgPressure,
          time: Date.now(),
        });
      }

      return {
        type: 'circle',
        points: circlePoints,
        label: isSquareRatio ? 'Círculo Perfeito' : 'Elipse',
      };
    }

    // C. RECTANGLE / SQUARE CHECK:
    // 4 corners OR high fill ratio (box filled >= 0.65)
    if (fillRatio >= 0.65 || corners.length === 4) {
      const isSquare = Math.abs(boxW - boxH) / Math.max(boxW, boxH) < 0.18;
      let finalMinX = minX;
      let finalMaxX = maxX;
      let finalMinY = minY;
      let finalMaxY = maxY;

      if (isSquare) {
        const side = (boxW + boxH) / 2;
        finalMinX = cx - side / 2;
        finalMaxX = cx + side / 2;
        finalMinY = cy - side / 2;
        finalMaxY = cy + side / 2;
      }

      const rectVertices: StrokePoint[] = [
        { x: finalMinX, y: finalMinY, pressure: avgPressure, time: Date.now() },
        { x: finalMaxX, y: finalMinY, pressure: avgPressure, time: Date.now() },
        { x: finalMaxX, y: finalMaxY, pressure: avgPressure, time: Date.now() },
        { x: finalMinX, y: finalMaxY, pressure: avgPressure, time: Date.now() },
        { x: finalMinX, y: finalMinY, pressure: avgPressure, time: Date.now() },
      ];

      const smoothRect: StrokePoint[] = [];
      for (let c = 0; c < 4; c++) {
        const p1 = rectVertices[c];
        const p2 = rectVertices[c + 1];
        for (let t = 0; t <= 8; t++) {
          const factor = t / 8;
          smoothRect.push({
            x: p1.x + (p2.x - p1.x) * factor,
            y: p1.y + (p2.y - p1.y) * factor,
            pressure: avgPressure,
            time: Date.now(),
          });
        }
      }

      return {
        type: 'rectangle',
        points: smoothRect,
        label: isSquare ? 'Quadrado Perfeito' : 'Retângulo',
      };
    }
  }

  // 2. LINE / VECTOR DETECTION:
  const isStraightLine =
    directDist > 16 &&
    (maxDev <= Math.max(22, directDist * 0.22) || lineRatio > 0.68);

  if (isStraightLine) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    let targetEndX = end.x;
    let targetEndY = end.y;

    // Snap to horizontal if close (+/- 7 degrees)
    if (Math.abs(angleDeg) < 7 || Math.abs(angleDeg) > 173) {
      targetEndY = start.y;
    }
    // Snap to vertical if close (+/- 7 degrees)
    else if (Math.abs(Math.abs(angleDeg) - 90) < 7) {
      targetEndX = start.x;
    }
    // Snap to 45 degrees if close (+/- 5 degrees)
    else if (
      Math.abs(Math.abs(angleDeg) - 45) < 5 ||
      Math.abs(Math.abs(angleDeg) - 135) < 5
    ) {
      const avgDelta = (Math.abs(dx) + Math.abs(dy)) / 2;
      targetEndX = start.x + Math.sign(dx) * avgDelta;
      targetEndY = start.y + Math.sign(dy) * avgDelta;
    }

    const stepCount = 14;
    const linePoints: StrokePoint[] = [];
    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      linePoints.push({
        x: start.x + (targetEndX - start.x) * t,
        y: start.y + (targetEndY - start.y) * t,
        pressure: avgPressure,
        time: Date.now(),
      });
    }

    // Check for arrow hook at end of line
    const hasArrowHook =
      points.length > 12 &&
      lineRatio > 0.72 &&
      lineRatio < 0.88 &&
      dist(points[points.length - 1], points[points.length - 4]) > 8;

    if (hasArrowHook) {
      const vdx = targetEndX - start.x;
      const vdy = targetEndY - start.y;
      const vlen = Math.sqrt(vdx * vdx + vdy * vdy);
      if (vlen > 35) {
        const ux = vdx / vlen;
        const uy = vdy / vlen;
        const arrowHeadSize = Math.min(22, vlen * 0.28);
        const wingW = arrowHeadSize * 0.6;

        linePoints.push({
          x: targetEndX - ux * arrowHeadSize + (-uy) * wingW,
          y: targetEndY - uy * arrowHeadSize + ux * wingW,
          pressure: avgPressure,
          time: Date.now(),
        });
        linePoints.push({
          x: targetEndX,
          y: targetEndY,
          pressure: avgPressure,
          time: Date.now(),
        });
        linePoints.push({
          x: targetEndX - ux * arrowHeadSize - (-uy) * wingW,
          y: targetEndY - uy * arrowHeadSize - ux * wingW,
          pressure: avgPressure,
          time: Date.now(),
        });

        return {
          type: 'arrow',
          points: linePoints,
          label: 'Vetor / Flecha',
        };
      }
    }

    return {
      type: 'line',
      points: linePoints,
      label: 'Linha Reta',
    };
  }

  return { type: 'none', points: rawPoints, label: '' };
}

/**
 * Snaps a line's start and end points to existing stroke endpoints within magnetic radius
 */
export function snapLineToExistingEndpoints(
  linePoints: StrokePoint[],
  existingStrokes: { points: StrokePoint[] }[],
  magneticRadius: number = 22
): StrokePoint[] {
  if (linePoints.length < 2 || existingStrokes.length === 0) return linePoints;

  const start = { ...linePoints[0] };
  const end = { ...linePoints[linePoints.length - 1] };

  let snappedStart = false;
  let snappedEnd = false;

  for (const stroke of existingStrokes) {
    if (stroke.points.length < 2) continue;
    const ep1 = stroke.points[0];
    const ep2 = stroke.points[stroke.points.length - 1];

    if (!snappedStart) {
      if (dist(start, ep1) <= magneticRadius) {
        start.x = ep1.x;
        start.y = ep1.y;
        snappedStart = true;
      } else if (dist(start, ep2) <= magneticRadius) {
        start.x = ep2.x;
        start.y = ep2.y;
        snappedStart = true;
      }
    }

    if (!snappedEnd) {
      if (dist(end, ep1) <= magneticRadius) {
        end.x = ep1.x;
        end.y = ep1.y;
        snappedEnd = true;
      } else if (dist(end, ep2) <= magneticRadius) {
        end.x = ep2.x;
        end.y = ep2.y;
        snappedEnd = true;
      }
    }

    if (snappedStart && snappedEnd) break;
  }

  if (!snappedStart && !snappedEnd) return linePoints;

  const count = linePoints.length;
  const result: StrokePoint[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    result.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      pressure: linePoints[i].pressure,
      time: linePoints[i].time,
    });
  }

  return result;
}
