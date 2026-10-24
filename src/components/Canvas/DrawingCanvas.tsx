import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PageData } from '../../types/notebook';
import { Stroke, A4_WIDTH, A4_HEIGHT } from '../../types/canvas';
import { useCanvasStore } from '../../store/useCanvasStore';
import { renderBackgroundPattern } from '../../engine/renderGrid';
import { drawStroke } from '../../engine/inking';
import { usePointerInput } from '../../hooks/usePointerInput';
import { useShortcuts } from '../../hooks/useShortcuts';

interface DrawingCanvasProps {
  page: PageData;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ page }) => {
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>(page.strokes || []);
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 1080 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, visible: false });

  const tool = useCanvasStore((s) => s.tool);
  const color = useCanvasStore((s) => s.color);
  const size = useCanvasStore((s) => s.size);
  const pressureCurve = useCanvasStore((s) => s.pressureCurve);
  const isDark = useCanvasStore((s) => s.isDark);
  const zoom = useCanvasStore((s) => s.zoom);
  const pan = useCanvasStore((s) => s.pan);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const saveCurrentStrokes = useCanvasStore((s) => s.saveCurrentStrokes);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const showToast = useCanvasStore((s) => s.showToast);
  const setCanvasActions = useCanvasStore((s) => s.setCanvasActions);

  // Sync strokes when active page changes
  useEffect(() => {
    setStrokes(page.strokes || []);
  }, [page.id]);

  // ResizeObserver to track container size dynamically in Infinite mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: Math.floor(entry.contentRect.width),
            height: Math.floor(entry.contentRect.height),
          });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const canvasWidth = page.format === 'a4' ? A4_WIDTH : containerSize.width;
  const canvasHeight = page.format === 'a4' ? A4_HEIGHT : containerSize.height;

  // Coordinate transformation: client screen coordinates to world coordinates
  const toWorldCoords = useCallback(
    (clientX: number, clientY: number) => {
      const overlay = overlayCanvasRef.current;
      if (!overlay) return { x: clientX, y: clientY };

      const rect = overlay.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;

      if (page.format === 'a4') {
        const scaleX = A4_WIDTH / rect.width;
        const scaleY = A4_HEIGHT / rect.height;
        return {
          x: screenX * scaleX,
          y: screenY * scaleY,
        };
      } else {
        return {
          x: (screenX - pan.x) / zoom,
          y: (screenY - pan.y) / zoom,
        };
      }
    },
    [page.format, pan, zoom]
  );

  // 1. Draw Base Layer: Background pattern + all committed strokes
  const drawBase = useCallback(
    (strokesToDraw: Stroke[]) => {
      const baseCanvas = baseCanvasRef.current;
      if (!baseCanvas) return;

      const ctx = baseCanvas.getContext('2d', { desynchronized: true });
      if (!ctx) return;

      const width = baseCanvas.width;
      const height = baseCanvas.height;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      if (page.format === 'a4') {
        renderBackgroundPattern(ctx, A4_WIDTH, A4_HEIGHT, page.pattern, isDark);

        for (const stroke of strokesToDraw) {
          drawStroke(ctx, stroke, pressureCurve, true);
        }
      } else {
        ctx.fillStyle = isDark ? '#18181B' : '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        renderBackgroundPattern(ctx, width * 3, height * 3, page.pattern, isDark);

        for (const stroke of strokesToDraw) {
          drawStroke(ctx, stroke, pressureCurve, true);
        }
      }

      ctx.restore();
    },
    [page.format, page.pattern, isDark, pan, zoom, pressureCurve]
  );

  // 2. Draw Overlay Layer: Only the live stroke currently being drawn
  const drawOverlay = useCallback(
    (liveStroke: Stroke | null) => {
      const overlayCanvas = overlayCanvasRef.current;
      if (!overlayCanvas) return;

      const ctx = overlayCanvas.getContext('2d', { desynchronized: true });
      if (!ctx) return;

      const width = overlayCanvas.width;
      const height = overlayCanvas.height;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      if (liveStroke) {
        if (page.format === 'a4') {
          drawStroke(ctx, liveStroke, pressureCurve, false);
        } else {
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);
          drawStroke(ctx, liveStroke, pressureCurve, false);
        }
      }

      ctx.restore();
    },
    [page.format, pan, zoom, pressureCurve]
  );

  // 3. Clear Overlay
  const clearOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }, []);

  // Redraw base when strokes, format, pattern, theme, zoom or pan change
  useEffect(() => {
    drawBase(strokes);
  }, [strokes, drawBase, canvasWidth, canvasHeight]);

  // Hook for capturing stylus pointer events on the overlay canvas
  usePointerInput({
    canvasRef: overlayCanvasRef,
    strokes,
    setStrokes,
    drawBase,
    drawOverlay,
    clearOverlay,
    toWorldCoords,
    onCursorMove: setCursorPos,
  });

  // Hook for shortcuts
  useShortcuts({
    strokes,
    setStrokes,
    redrawAll: drawBase,
  });

  // Handle undo/redo from toolbar or shortcuts
  const handleUndo = useCallback(() => {
    const prev = undo(strokes);
    if (prev !== null) {
      setStrokes(prev);
      drawBase(prev);
      saveCurrentStrokes(prev);
      showToast('Desfeito', 'info');
    }
  }, [undo, strokes, drawBase, saveCurrentStrokes, showToast]);

  const handleRedo = useCallback(() => {
    const next = redo(strokes);
    if (next !== null) {
      setStrokes(next);
      drawBase(next);
      saveCurrentStrokes(next);
      showToast('Refeito', 'info');
    }
  }, [redo, strokes, drawBase, saveCurrentStrokes, showToast]);

  const handleClearPage = useCallback(() => {
    if (strokes.length === 0) return;
    if (window.confirm('Tem certeza de que deseja limpar todos os traços desta página?')) {
      pushHistory(strokes);
      setStrokes([]);
      drawBase([]);
      saveCurrentStrokes([]);
      showToast('Página limpa', 'info');
    }
  }, [strokes, pushHistory, drawBase, saveCurrentStrokes, showToast]);

  useEffect(() => {
    setCanvasActions({
      undo: handleUndo,
      redo: handleRedo,
      clear: handleClearPage,
    });
    return () => {
      setCanvasActions({ undo: null, redo: null, clear: null });
    };
  }, [strokes, handleUndo, handleRedo, handleClearPage, setCanvasActions]);

  // Cursor tip size computation
  const cursorDiameter =
    tool === 'eraser' ? 28 : tool === 'highlighter' ? size * 4 * zoom : Math.max(4, size * zoom);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-900 select-none"
    >
      {/* Dynamic Brush Tip Indicator */}
      {cursorPos.visible && (
        <div
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${cursorDiameter}px`,
            height: `${cursorDiameter}px`,
            transform: 'translate(-50%, -50%)',
            borderColor: tool === 'eraser' ? '#EF4444' : color,
          }}
          className={`fixed pointer-events-none rounded-full border-2 transition-transform duration-75 z-50 ${
            tool === 'eraser' ? 'bg-red-500/20' : 'bg-transparent'
          }`}
        />
      )}

      {/* Canvas Viewport */}
      {page.format === 'a4' ? (
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 75ms ease-out',
            width: `${(A4_WIDTH * 0.55).toFixed(0)}px`,
            height: `${(A4_HEIGHT * 0.55).toFixed(0)}px`,
          }}
          className="relative shadow-2xl rounded-xs overflow-hidden border border-gray-300 dark:border-gray-700 bg-white"
        >
          {/* Base Layer */}
          <canvas
            ref={baseCanvasRef}
            width={A4_WIDTH}
            height={A4_HEIGHT}
            className="absolute inset-0 w-full h-full block"
          />

          {/* Overlay Layer (receives pointer events) */}
          <canvas
            ref={overlayCanvasRef}
            width={A4_WIDTH}
            height={A4_HEIGHT}
            className="absolute inset-0 w-full h-full block cursor-none"
          />
        </div>
      ) : (
        <div className="relative w-full h-full">
          {/* Base Layer */}
          <canvas
            ref={baseCanvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="absolute inset-0 w-full h-full block"
          />

          {/* Overlay Layer (receives pointer events) */}
          <canvas
            ref={overlayCanvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="absolute inset-0 w-full h-full block cursor-none"
          />
        </div>
      )}
    </div>
  );
};
