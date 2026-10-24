import React from 'react';
import {
  PanelLeft,
  Grid,
  Home,
  SlidersHorizontal,
  Share2,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { useNotebookStore } from '../store/useNotebookStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { PageFormat, BackgroundPattern } from '../types/canvas';

interface HeaderProps {
  onOpenExport: () => void;
  onOpenCalibration: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExport, onOpenCalibration }) => {
  const subjects = useNotebookStore((s) => s.subjects);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const pages = useNotebookStore((s) => s.pages);
  const activeSubjectId = useNotebookStore((s) => s.activeSubjectId);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const activePageId = useNotebookStore((s) => s.activePageId);
  const viewMode = useNotebookStore((s) => s.viewMode);
  const setViewMode = useNotebookStore((s) => s.setViewMode);
  const updatePageMeta = useNotebookStore((s) => s.updatePageMeta);

  const toggleSidebar = useCanvasStore((s) => s.toggleSidebar);
  const isDark = useCanvasStore((s) => s.isDark);
  const toggleDarkMode = useCanvasStore((s) => s.toggleDarkMode);
  const zenMode = useCanvasStore((s) => s.zenMode);
  const toggleZenMode = useCanvasStore((s) => s.toggleZenMode);
  const zoom = useCanvasStore((s) => s.zoom);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const showToast = useCanvasStore((s) => s.showToast);

  const activeSubject = subjects.find((s) => s.id === activeSubjectId);
  const activeNotebook = notebooks.find((nb) => nb.id === activeNotebookId);
  const activePage = pages.find((p) => p.id === activePageId);

  const handleFormatChange = (format: PageFormat) => {
    if (!activePageId) return;
    updatePageMeta(activePageId, { format });
    showToast(`Formato alterado para: ${format === 'a4' ? 'Paginado A4' : 'Canvas Infinito'}`, 'info');
  };

  const handlePatternChange = (pattern: BackgroundPattern) => {
    if (!activePageId) return;
    updatePageMeta(activePageId, { pattern });
    showToast(`Template alterado para: ${pattern}`, 'info');
  };

  // If in zen mode, hide header or keep tiny floating trigger
  if (zenMode) {
    return (
      <div className="fixed top-2 right-2 z-40 flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xs p-1.5 rounded-md border border-gray-200 dark:border-gray-700 shadow-md">
        <button
          onClick={toggleZenMode}
          title="Sair do Modo Foco (F)"
          className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <Minimize2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <header className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left side: Navigation / Breadcrumb */}
      <div className="flex items-center gap-2 text-sm overflow-hidden">
        <button
          onClick={toggleSidebar}
          title="Alternar Barra Lateral (Ctrl+B)"
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <PanelLeft size={18} />
        </button>

        <button
          onClick={() => setViewMode('dashboard')}
          title="Ir para o Dashboard"
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <Home size={17} />
        </button>

        {viewMode !== 'dashboard' && (
          <button
            onClick={() => setViewMode('grid')}
            title="Ver Todas as Páginas do Caderno"
            className={`p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
            }`}
          >
            <Grid size={17} />
          </button>
        )}

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Breadcrumb path */}
        <div className="flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-gray-400 font-medium">
          {activeSubject && (
            <span className="flex items-center gap-1 text-gray-800 dark:text-gray-200 font-semibold truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeSubject.color }}
              />
              {activeSubject.name}
            </span>
          )}

          {activeNotebook && (
            <>
              <span>/</span>
              <span className="truncate">{activeNotebook.title}</span>
            </>
          )}

          {viewMode === 'studio' && activePage && (
            <>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono font-semibold shrink-0">
                Pág. {activePage.pageNumber}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Center: Page Controls (Only in Studio mode) */}
      {viewMode === 'studio' && activePage && (
        <div className="hidden md:flex items-center gap-2 text-xs">
          {/* Format selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-md border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => handleFormatChange('a4')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                activePage.format === 'a4'
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              A4 Paginado
            </button>
            <button
              onClick={() => handleFormatChange('infinite')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                activePage.format === 'infinite'
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Canvas Infinito
            </button>
          </div>

          {/* Pattern selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-md border border-gray-200 dark:border-gray-600">
            {(['lined', 'grid', 'dotted', 'blank'] as BackgroundPattern[]).map((pat) => (
              <button
                key={pat}
                onClick={() => handlePatternChange(pat)}
                className={`px-2 py-1 rounded font-medium capitalize transition-colors ${
                  activePage.pattern === pat
                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                }`}
              >
                {pat === 'lined' && 'Pautado'}
                {pat === 'grid' && 'Grade'}
                {pat === 'dotted' && 'Pontos'}
                {pat === 'blank' && 'Liso'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right side: Tools, Zoom, Calibration, Export */}
      <div className="flex items-center gap-1.5">
        {/* Zoom Controls */}
        {viewMode === 'studio' && (
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/60 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-600 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
              title="Reduzir Zoom"
              className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={resetViewport}
              title="Resetar Zoom (100%)"
              className="font-mono text-gray-700 dark:text-gray-300 px-1 hover:text-blue-600"
            >
              {(zoom * 100).toFixed(0)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(4.0, z + 0.1))}
              title="Aumentar Zoom"
              className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={resetViewport}
              title="Centralizar Folha"
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <RotateCcw size={11} />
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Wacom Calibration Modal trigger */}
        <button
          onClick={onOpenCalibration}
          title="Calibração da Caneta Wacom & Configurações"
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <SlidersHorizontal size={16} />
        </button>

        {/* Export Modal trigger */}
        <button
          onClick={onOpenExport}
          title="Exportar Caderno em PDF / Backup"
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <Share2 size={16} />
        </button>

        {/* Dark Mode toggle */}
        <button
          onClick={toggleDarkMode}
          title="Alternar Tema Claro/Escuro"
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Zen/Focus Mode */}
        <button
          onClick={toggleZenMode}
          title="Modo Foco Tela Cheia (F)"
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </header>
  );
};

