import React, { useRef, useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, RotateCcw } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { PressureCurve, ToolbarPosition, StrokePoint } from '../../types/canvas';
import { drawStroke } from '../../engine/inking';

interface CalibrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({ open, onOpenChange }) => {
  const pressureCurve = useCanvasStore((s) => s.pressureCurve);
  const setPressureCurve = useCanvasStore((s) => s.setPressureCurve);
  const toolbarPosition = useCanvasStore((s) => s.toolbarPosition);
  const setToolbarPosition = useCanvasStore((s) => s.setToolbarPosition);
  const isDark = useCanvasStore((s) => s.isDark);

  const [currentPressure, setCurrentPressure] = useState(0);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);

  // Clear test canvas
  const handleClear = () => {
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current = [];
    setCurrentPressure(0);
  };

  useEffect(() => {
    const canvas = testCanvasRef.current;
    if (!canvas || !open) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas dimensions to match display
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pressure = e.pressure > 0 ? e.pressure : 0.5;
      setCurrentPressure(pressure);

      pointsRef.current = [{ x, y, pressure, time: Date.now() }];
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pressure = e.pressure > 0 ? e.pressure : 0.5;
      setCurrentPressure(pressure);

      pointsRef.current.push({ x, y, pressure, time: Date.now() });

      // Draw stroke
      const stroke = {
        id: 'test',
        tool: 'pen' as const,
        color: isDark ? '#F3F4F6' : '#111827',
        size: 3.5,
        points: pointsRef.current,
        createdAt: Date.now(),
      };

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawStroke(ctx, stroke, pressureCurve);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      isDrawingRef.current = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [open, pressureCurve, isDark]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity duration-150" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 transition-all duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Calibração da Wacom e Preferências
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            {/* Pressure Curve */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-2">
                Curva de Pressão da Caneta
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['soft', 'normal', 'firm'] as PressureCurve[]).map((curve) => (
                  <button
                    key={curve}
                    type="button"
                    onClick={() => setPressureCurve(curve)}
                    className={`py-2 px-3 rounded-md border text-xs font-medium transition-colors ${
                      pressureCurve === curve
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {curve === 'soft' && 'Macia (Leve)'}
                    {curve === 'normal' && 'Normal (Linear)'}
                    {curve === 'firm' && 'Firme (Pesada)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Test canvas */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Área de Teste de Traço
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Pressão: <strong className="font-mono text-blue-600 dark:text-blue-400">{(currentPressure * 100).toFixed(0)}%</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    <RotateCcw size={12} />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-900 h-28 relative">
                <canvas
                  ref={testCanvasRef}
                  className="w-full h-full cursor-crosshair"
                />
                {pointsRef.current.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 pointer-events-none">
                    Pressione e deslize sua caneta Wacom aqui para testar
                  </div>
                )}
              </div>
            </div>

            {/* Toolbar Position */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-2">
                Posição da Barra de Ferramentas
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['bottom', 'top', 'left', 'right'] as ToolbarPosition[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setToolbarPosition(pos)}
                    className={`py-1.5 px-2 rounded-md border text-xs font-medium capitalize transition-colors ${
                      toolbarPosition === pos
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pos === 'bottom' && 'Base'}
                    {pos === 'top' && 'Topo'}
                    {pos === 'left' && 'Esquerda'}
                    {pos === 'right' && 'Direita'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
