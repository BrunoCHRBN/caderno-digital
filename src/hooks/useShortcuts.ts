import { useEffect } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { Stroke } from '../types/canvas';

interface UseShortcutsProps {
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  redrawAll: (currentStrokes: Stroke[]) => void;
}

export function useShortcuts({ strokes, setStrokes, redrawAll }: UseShortcutsProps) {
  const setTool = useCanvasStore((s) => s.setTool);
  const setSize = useCanvasStore((s) => s.setSize);
  const size = useCanvasStore((s) => s.size);
  const toggleZenMode = useCanvasStore((s) => s.toggleZenMode);
  const toggleSidebar = useCanvasStore((s) => s.toggleSidebar);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const saveCurrentStrokes = useCanvasStore((s) => s.saveCurrentStrokes);
  const showToast = useCanvasStore((s) => s.showToast);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut when user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        const prev = undo(strokes);
        if (prev !== null) {
          setStrokes(prev);
          redrawAll(prev);
          saveCurrentStrokes(prev);
          showToast('Desfeito', 'info');
        }
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        const next = redo(strokes);
        if (next !== null) {
          setStrokes(next);
          redrawAll(next);
          saveCurrentStrokes(next);
          showToast('Refeito', 'info');
        }
        return;
      }

      // Toggle Sidebar: Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Single keys
      switch (e.key.toLowerCase()) {
        case 'b':
        case 'p':
          setTool('pen');
          showToast('Caneta', 'info');
          break;
        case 'h':
          setTool('highlighter');
          showToast('Marca-texto', 'info');
          break;
        case 'e':
          setTool('eraser');
          showToast('Borracha', 'info');
          break;
        case '[':
          setSize(Math.max(1, size - 1));
          break;
        case ']':
          setSize(Math.min(20, size + 1));
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) {
            toggleZenMode();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    strokes,
    setStrokes,
    redrawAll,
    setTool,
    setSize,
    size,
    toggleZenMode,
    toggleSidebar,
    undo,
    redo,
    saveCurrentStrokes,
    showToast,
  ]);
}

