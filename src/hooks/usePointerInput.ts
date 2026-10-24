import { useRef, useCallback, useEffect } from 'react';
import { Stroke, StrokePoint } from '../types/canvas';
import { useCanvasStore } from '../store/useCanvasStore';
import { isPointNearStroke } from '../engine/inking';
import {
  recognizeShape,
  snapLineToExistingEndpoints,
  RecognizedShape,
  dist,
} from '../engine/shapeRecognition';

interface UsePointerInputProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  drawBase: (strokesToDraw: Stroke[]) => void;
  drawOverlay: (liveStroke: Stroke | null) => void;
  clearOverlay: () => void;
  toWorldCoords: (clientX: number, clientY: number) => { x: number; y: number };
  onCursorMove?: (pos: { x: number; y: number; visible: boolean }) => void;
}

export function usePointerInput({
  canvasRef,
  strokes,
  setStrokes,
  drawBase,
  drawOverlay,
  clearOverlay,
  toWorldCoords,
  onCursorMove,
}: UsePointerInputProps) {
  const isPointerDownRef = useRef(false);
  const currentPointsRef = useRef<StrokePoint[]>([]);
  const isErasingRef = useRef(false);

  // Shape detection state
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stillStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const stillStartTimeRef = useRef<number | null>(null);
  const isShapeSnappedRef = useRef(false);
  const detectedShapeRef = useRef<RecognizedShape | null>(null);
  const firstPointRef = useRef<StrokePoint | null>(null);

  const tool = useCanvasStore((s) => s.tool);
  const color = useCanvasStore((s) => s.color);
  const size = useCanvasStore((s) => s.size);
  const pressureCurve = useCanvasStore((s) => s.pressureCurve);
  const autoShapeDetection = useCanvasStore((s) => s.autoShapeDetection);
  const setIsDrawing = useCanvasStore((s) => s.setIsDrawing);
  const setTemporaryEraser = useCanvasStore((s) => s.setTemporaryEraser);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const saveCurrentStrokes = useCanvasStore((s) => s.saveCurrentStrokes);
  const showToast = useCanvasStore((s) => s.showToast);

  // Keep references updated for event handlers
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const toolRef = useRef(tool);
  toolRef.current = tool;

  const colorRef = useRef(color);
  colorRef.current = color;

  const sizeRef = useRef(size);
  sizeRef.current = size;

  const pressureCurveRef = useRef(pressureCurve);
  pressureCurveRef.current = pressureCurve;

  const autoShapeDetectionRef = useRef(autoShapeDetection);
  autoShapeDetectionRef.current = autoShapeDetection;

  // Handle eraser stroke check
  const handleEraserAt = useCallback(
    (point: { x: number; y: number }) => {
      const remaining = strokesRef.current.filter((stroke) => !isPointNearStroke(point, stroke, 16));
      if (remaining.length !== strokesRef.current.length) {
        strokesRef.current = remaining;
        setStrokes(remaining);
        drawBase(remaining);
      }
    },
    [setStrokes, drawBase]
  );

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const triggerShapeSnap = useCallback(() => {
    if (!isPointerDownRef.current || isShapeSnappedRef.current) return;

    const shape = recognizeShape(currentPointsRef.current);
    if (shape.type !== 'none') {
      isShapeSnappedRef.current = true;
      detectedShapeRef.current = shape;

      // Magnetically snap to endpoints of existing lines if nearby (e.g. closing a triangle)
      let finalPoints = shape.points;
      if (shape.type === 'line' || shape.type === 'arrow') {
        finalPoints = snapLineToExistingEndpoints(shape.points, strokesRef.current, 24);
      }

      currentPointsRef.current = finalPoints;

      drawOverlay({
        id: `stroke-live`,
        tool: toolRef.current,
        color: colorRef.current,
        size: sizeRef.current,
        points: finalPoints,
        createdAt: Date.now(),
      });

      showToast(`Forma ajustada: ${shape.label}`, 'info');
    }
  }, [drawOverlay, showToast]);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.setPointerCapture(e.pointerId);

      // Check if right button on stylus is pressed
      if (e.buttons === 2 || e.button === 2) {
        setTemporaryEraser(true);
      }

      const worldPos = toWorldCoords(e.clientX, e.clientY);
      const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

      isPointerDownRef.current = true;
      isShapeSnappedRef.current = false;
      detectedShapeRef.current = null;
      stillStartPosRef.current = worldPos;
      stillStartTimeRef.current = Date.now();
      setIsDrawing(true);
      clearHoldTimer();

      const activeTool = toolRef.current;

      if (activeTool === 'eraser') {
        isErasingRef.current = true;
        pushHistory(strokesRef.current);
        handleEraserAt(worldPos);
      } else {
        isErasingRef.current = false;
        const initialPoint: StrokePoint = {
          x: worldPos.x,
          y: worldPos.y,
          pressure,
          time: Date.now(),
        };

        firstPointRef.current = initialPoint;
        currentPointsRef.current = [initialPoint];

        const liveStroke: Stroke = {
          id: `stroke-live`,
          tool: activeTool,
          color: colorRef.current,
          size: sizeRef.current,
          points: currentPointsRef.current,
          createdAt: Date.now(),
        };

        drawOverlay(liveStroke);
      }
    },
    [canvasRef, toWorldCoords, setTemporaryEraser, setIsDrawing, pushHistory, handleEraserAt, drawOverlay, clearHoldTimer]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      // Update custom cursor position
      if (onCursorMove) {
        onCursorMove({ x: e.clientX, y: e.clientY, visible: true });
      }

      if (!isPointerDownRef.current) return;
      e.preventDefault();

      const worldPos = toWorldCoords(e.clientX, e.clientY);
      const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
      const activeTool = toolRef.current;

      if (activeTool === 'eraser' || isErasingRef.current) {
        handleEraserAt(worldPos);
        return;
      }

      // If already snapped into a shape, moving the pen adjusts the shape in real time
      if (isShapeSnappedRef.current && firstPointRef.current && detectedShapeRef.current) {
        const shapeType = detectedShapeRef.current.type;
        const start = firstPointRef.current;

        if (shapeType === 'line' || shapeType === 'arrow') {
          const lineResult = recognizeShape([
            start,
            { x: (start.x + worldPos.x) / 2, y: (start.y + worldPos.y) / 2, pressure, time: Date.now() },
            { x: worldPos.x, y: worldPos.y, pressure, time: Date.now() },
          ]);

          if (lineResult.type === 'line' || lineResult.type === 'arrow') {
            const snapped = snapLineToExistingEndpoints(lineResult.points, strokesRef.current, 24);
            currentPointsRef.current = snapped;
            drawOverlay({
              id: 'stroke-live',
              tool: activeTool,
              color: colorRef.current,
              size: sizeRef.current,
              points: snapped,
              createdAt: Date.now(),
            });
          }
        }
        return;
      }

      // Normal inking: avoid duplicate points if pen moved < 2px
      const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
      const deltaX = worldPos.x - lastPoint.x;
      const deltaY = worldPos.y - lastPoint.y;
      if (deltaX * deltaX + deltaY * deltaY >= 2.5) {
        currentPointsRef.current.push({
          x: worldPos.x,
          y: worldPos.y,
          pressure,
          time: Date.now(),
        });
      }

      const liveStroke: Stroke = {
        id: `stroke-live`,
        tool: activeTool,
        color: colorRef.current,
        size: sizeRef.current,
        points: currentPointsRef.current,
        createdAt: Date.now(),
      };

      drawOverlay(liveStroke);

      // "Draw and Hold" Gesture Detection with Spatial Displacement Window:
      // If the pen stays within an 8px radius for 350ms, trigger shape snap!
      if (autoShapeDetectionRef.current && currentPointsRef.current.length > 5) {
        const lastStill = stillStartPosRef.current;
        if (lastStill) {
          const movedDist = dist(worldPos, lastStill);
          if (movedDist > 8.0) {
            // Pen is actively drawing! Reset stationary reference and timer
            stillStartPosRef.current = worldPos;
            stillStartTimeRef.current = Date.now();
            clearHoldTimer();
            holdTimerRef.current = setTimeout(triggerShapeSnap, 350);
          } else {
            // Pen is holding still in the same spot!
            // If timer not already running, schedule it
            if (!holdTimerRef.current) {
              const elapsed = Date.now() - (stillStartTimeRef.current || Date.now());
              const remaining = Math.max(0, 350 - elapsed);
              holdTimerRef.current = setTimeout(triggerShapeSnap, remaining);
            }
          }
        } else {
          stillStartPosRef.current = worldPos;
          stillStartTimeRef.current = Date.now();
          holdTimerRef.current = setTimeout(triggerShapeSnap, 350);
        }
      }
    },
    [toWorldCoords, handleEraserAt, drawOverlay, onCursorMove, clearHoldTimer, triggerShapeSnap]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      e.preventDefault();

      clearHoldTimer();
      stillStartPosRef.current = null;
      stillStartTimeRef.current = null;

      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }

      isPointerDownRef.current = false;
      setIsDrawing(false);
      setTemporaryEraser(false);

      if (isErasingRef.current) {
        isErasingRef.current = false;
        saveCurrentStrokes(strokesRef.current);
      } else if (currentPointsRef.current.length > 0) {
        const newStroke: Stroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tool: toolRef.current,
          color: colorRef.current,
          size: sizeRef.current,
          points: [...currentPointsRef.current],
          createdAt: Date.now(),
        };

        // Record for undo
        pushHistory(strokesRef.current);

        const updated = [...strokesRef.current, newStroke];
        strokesRef.current = updated;
        setStrokes(updated);
        saveCurrentStrokes(updated);

        currentPointsRef.current = [];
        isShapeSnappedRef.current = false;
        detectedShapeRef.current = null;
        clearOverlay();
        drawBase(updated);
      }
    },
    [
      canvasRef,
      setIsDrawing,
      setTemporaryEraser,
      saveCurrentStrokes,
      pushHistory,
      setStrokes,
      clearOverlay,
      drawBase,
      clearHoldTimer,
    ]
  );

  const handlePointerLeave = useCallback(() => {
    if (onCursorMove) {
      onCursorMove({ x: 0, y: 0, visible: false });
    }
  }, [onCursorMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Attach native pointer listeners
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener('contextmenu', preventContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('contextmenu', preventContextMenu);
      clearHoldTimer();
    };
  }, [canvasRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, clearHoldTimer]);

  return {
    isPointerDown: isPointerDownRef.current,
  };
}
