export type ToolType = 'pen' | 'highlighter' | 'eraser';

export type PageFormat = 'a4' | 'infinite';

export type BackgroundPattern = 'lined' | 'grid' | 'dotted' | 'blank';

export type ViewMode = 'dashboard' | 'grid' | 'studio';

export type PressureCurve = 'soft' | 'normal' | 'firm';

export type ToolbarPosition = 'top' | 'bottom' | 'left' | 'right';

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  time?: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  size: number;
  points: StrokePoint[];
  createdAt: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

// A4 Dimensions: 1240 x 1754 px at ~150 DPI
export const A4_WIDTH = 1240;
export const A4_HEIGHT = 1754;

