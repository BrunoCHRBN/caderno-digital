import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { DrawingCanvas } from './DrawingCanvas';
import { Toolbar } from '../Toolbar';

export const CanvasContainer: React.FC = () => {
  const pages = useNotebookStore((s) => s.pages);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const activePageId = useNotebookStore((s) => s.activePageId);
  const setActivePage = useNotebookStore((s) => s.setActivePage);
  const createPage = useNotebookStore((s) => s.createPage);

  const setPan = useCanvasStore((s) => s.setPan);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const showToast = useCanvasStore((s) => s.showToast);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Filter pages belonging to active notebook
  const notebookPages = pages
    .filter((p) => p.notebookId === activeNotebookId)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const currentPageIndex = notebookPages.findIndex((p) => p.id === activePageId);
  const activePage = notebookPages[currentPageIndex] || notebookPages[0];

  // Key listeners for spacebar pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        isPanningRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Native wheel event listener for smooth pan and Ctrl+Wheel / Pinch zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom towards center
        const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
        setZoom((z) => Math.min(Math.max(z * zoomDelta, 0.25), 4.0));
      } else {
        // Pan
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setZoom, setPan]);

  // Middle-click or Space+drag pan handler
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpacePressed) {
      e.preventDefault();
      isPanningRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  // Pagination actions
  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setActivePage(notebookPages[currentPageIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < notebookPages.length - 1) {
      setActivePage(notebookPages[currentPageIndex + 1].id);
    }
  };

  const handleCreateNewPage = async () => {
    if (!activeNotebookId) return;
    const newId = await createPage(activeNotebookId);
    setActivePage(newId);
    showToast('Nova página criada', 'success');
  };

  if (!activePage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">Nenhuma página selecionada.</p>
        {activeNotebookId && (
          <button
            onClick={handleCreateNewPage}
            className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
          >
            Criar primeira página
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative flex-1 h-full overflow-hidden flex flex-col ${
        isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      {/* Central Canvas Viewport */}
      <DrawingCanvas key={activePage.id} page={activePage} />

      {/* Floating Pagination bar for A4 mode */}
      {activePage.format === 'a4' && (
        <div className="absolute bottom-5 left-6 z-20 flex items-center gap-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md text-xs select-none">
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex <= 0}
            title="Página Anterior"
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 rounded-md"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="font-mono text-gray-700 dark:text-gray-200 px-1 font-medium">
            {currentPageIndex + 1} / {notebookPages.length}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPageIndex >= notebookPages.length - 1}
            title="Próxima Página"
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 rounded-md"
          >
            <ChevronRight size={16} />
          </button>

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />

          <button
            onClick={handleCreateNewPage}
            title="Adicionar Nova Página ao Caderno"
            className="flex items-center gap-1 px-1.5 py-0.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md font-medium"
          >
            <Plus size={14} />
            <span>Página</span>
          </button>
        </div>
      )}

      {/* Inking Toolbar */}
      <Toolbar />
    </div>
  );
};
