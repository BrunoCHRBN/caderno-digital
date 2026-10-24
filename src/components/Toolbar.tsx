import React from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Shapes,
} from 'lucide-react';
import { useCanvasStore } from '../store/useCanvasStore';

interface ToolbarProps {
  onClearPage?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const PEN_COLORS = [
  '#111827', // Preto / Grafite
  '#1D4ED8', // Azul
  '#DC2626', // Vermelho
  '#15803D', // Verde
  '#7C3AED', // Roxo
];

const HIGHLIGHTER_COLORS = [
  '#EAB308', // Amarelo
  '#22C55E', // Verde
  '#3B82F6', // Azul
  '#F43F5E', // Rosa
];

const SIZE_PRESETS = [
  { label: 'Fino', value: 1.5 },
  { label: 'Médio', value: 3.5 },
  { label: 'Grosso', value: 6.0 },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  onClearPage,
  onUndo,
  onRedo,
}) => {
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const color = useCanvasStore((s) => s.color);
  const setColor = useCanvasStore((s) => s.setColor);
  const size = useCanvasStore((s) => s.size);
  const setSize = useCanvasStore((s) => s.setSize);
  const toolbarPosition = useCanvasStore((s) => s.toolbarPosition);
  const undoStack = useCanvasStore((s) => s.undoStack);
  const redoStack = useCanvasStore((s) => s.redoStack);
  const autoShapeDetection = useCanvasStore((s) => s.autoShapeDetection);
  const toggleAutoShapeDetection = useCanvasStore((s) => s.toggleAutoShapeDetection);
  const canvasActions = useCanvasStore((s) => s.canvasActions);

  const handleUndo = onUndo || canvasActions.undo || undefined;
  const handleRedo = onRedo || canvasActions.redo || undefined;
  const handleClear = onClearPage || canvasActions.clear || undefined;

  const colors = tool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS;

  const getPositionClass = () => {
    switch (toolbarPosition) {
      case 'top':
        return 'top-14 left-1/2 -translate-x-1/2 flex-row';
      case 'left':
        return 'left-4 top-1/2 -translate-y-1/2 flex-col';
      case 'right':
        return 'right-4 top-1/2 -translate-y-1/2 flex-col';
      case 'bottom':
      default:
        return 'bottom-5 left-1/2 -translate-x-1/2 flex-row';
    }
  };

  const isVertical = toolbarPosition === 'left' || toolbarPosition === 'right';

  return (
    <div
      className={`fixed ${getPositionClass()} z-30 flex items-center gap-2 p-1.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xs rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg select-none transition-all duration-150`}
    >
      {/* Tool Selection (Pen, Highlighter, Eraser) */}
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1`}>
        <button
          onClick={() => setTool('pen')}
          title="Caneta (B)"
          className={`p-2 rounded-lg transition-all ${
            tool === 'pen'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Pen size={18} />
        </button>

        <button
          onClick={() => setTool('highlighter')}
          title="Marca-texto (H)"
          className={`p-2 rounded-lg transition-all ${
            tool === 'highlighter'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Highlighter size={18} />
        </button>

        <button
          onClick={() => setTool('eraser')}
          title="Borracha (E ou Botão da Wacom)"
          className={`p-2 rounded-lg transition-all ${
            tool === 'eraser'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Eraser size={18} />
        </button>

        <button
          onClick={toggleAutoShapeDetection}
          title={`Auto-correção de Formas: ${autoShapeDetection ? 'Ativada (Segure a caneta 400ms para endireitar)' : 'Desativada'}`}
          className={`p-2 rounded-lg transition-all ${
            autoShapeDetection
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium'
              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Shapes size={17} />
        </button>
      </div>

      <div
        className={`${
          isVertical ? 'w-full h-px my-1' : 'h-6 w-px mx-1'
        } bg-gray-200 dark:bg-gray-700`}
      />

      {/* Color Palette (disabled when eraser is active) */}
      {tool !== 'eraser' && (
        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1.5`}>
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full transition-transform ${
                color === c
                  ? 'ring-2 ring-offset-2 ring-blue-500 scale-115'
                  : 'opacity-85 hover:opacity-100 hover:scale-105'
              }`}
            />
          ))}
        </div>
      )}

      {tool !== 'eraser' && (
        <div
          className={`${
            isVertical ? 'w-full h-px my-1' : 'h-6 w-px mx-1'
          } bg-gray-200 dark:bg-gray-700`}
        />
      )}

      {/* Thickness Presets */}
      {tool !== 'eraser' && (
        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1`}>
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setSize(p.value)}
              title={`Espessura ${p.label}: ${p.value}px`}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                Math.abs(size - p.value) < 0.5
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {tool !== 'eraser' && (
        <div
          className={`${
            isVertical ? 'w-full h-px my-1' : 'h-6 w-px mx-1'
          } bg-gray-200 dark:bg-gray-700`}
        />
      )}

      {/* History and Actions (Undo, Redo, Clear) */}
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1`}>
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title="Desfazer (Ctrl+Z)"
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
        >
          <Undo2 size={16} />
        </button>

        <button
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          title="Refazer (Ctrl+Y)"
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
        >
          <Redo2 size={16} />
        </button>

        {handleClear && (
          <button
            onClick={handleClear}
            title="Limpar Todos os Traços da Página"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
