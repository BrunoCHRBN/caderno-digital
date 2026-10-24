import React, { useState } from 'react';
import {
  Plus,
  ArrowLeft,
  Copy,
  Trash2,
  FileText,
  FileCheck,
  Download,
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { exportPagesToPDF } from '../../engine/pdfExport';

export const PageGridView: React.FC = () => {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const subjects = useNotebookStore((s) => s.subjects);
  const pages = useNotebookStore((s) => s.pages);
  const activeSubjectId = useNotebookStore((s) => s.activeSubjectId);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const setActivePage = useNotebookStore((s) => s.setActivePage);
  const setViewMode = useNotebookStore((s) => s.setViewMode);
  const createPage = useNotebookStore((s) => s.createPage);
  const deletePage = useNotebookStore((s) => s.deletePage);
  const duplicatePage = useNotebookStore((s) => s.duplicatePage);

  const isDark = useCanvasStore((s) => s.isDark);
  const showToast = useCanvasStore((s) => s.showToast);

  const currentSubject = subjects.find((s) => s.id === activeSubjectId);
  const currentNotebook = notebooks.find((nb) => nb.id === activeNotebookId);
  const notebookPages = pages
    .filter((p) => p.notebookId === activeNotebookId)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  // Selected pages for batch PDF export
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  const toggleSelectPage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPageIds.length === notebookPages.length) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(notebookPages.map((p) => p.id));
    }
  };

  const handleOpenPage = (pageId: string) => {
    setActivePage(pageId);
    setViewMode('studio');
  };

  const handleCreatePage = async () => {
    if (!activeNotebookId) return;
    const newId = await createPage(activeNotebookId);
    setActivePage(newId);
    setViewMode('studio');
    showToast('Nova página criada', 'success');
  };

  const handleDuplicate = async (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    await duplicatePage(pageId);
    showToast('Página duplicada com sucesso', 'success');
  };

  const handleDelete = async (e: React.MouseEvent, pageId: string, pageNumber: number) => {
    e.stopPropagation();
    if (window.confirm(`Excluir a página ${pageNumber}? Esta ação não pode ser desfeita.`)) {
      await deletePage(pageId);
      showToast(`Página ${pageNumber} excluída`, 'info');
    }
  };

  const handleExportBatchPDF = async () => {
    const pagesToExport = notebookPages.filter((p) => selectedPageIds.includes(p.id));
    if (pagesToExport.length === 0) return;

    await exportPagesToPDF({
      includeBackground: true,
      isDark,
      pages: pagesToExport,
      title: `${currentNotebook?.title || 'Caderno'}_selecao`,
    });
    showToast(`PDF com ${pagesToExport.length} páginas exportado!`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('dashboard')}
              title="Voltar ao Painel"
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                {currentSubject && (
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentSubject.color }}
                  />
                )}
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {currentNotebook?.title || 'Caderno de Estudos'}
                </h1>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {currentSubject?.name} • {notebookPages.length} páginas no total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedPageIds.length > 0 && (
              <button
                onClick={handleExportBatchPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors"
              >
                <Download size={14} />
                <span>Exportar Selecionadas ({selectedPageIds.length})</span>
              </button>
            )}

            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md hover:bg-gray-50"
            >
              {selectedPageIds.length === notebookPages.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </button>

            <button
              onClick={handleCreatePage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors"
            >
              <Plus size={15} />
              <span>Nova Página</span>
            </button>
          </div>
        </div>

        {/* Pages Grid */}
        {notebookPages.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-8">
            <FileText className="mx-auto text-gray-400 mb-2" size={32} />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nenhuma página neste caderno
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Crie a primeira folha para começar a fazer anotações com sua caneta Wacom.
            </p>
            <button
              onClick={handleCreatePage}
              className="mt-4 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
            >
              Criar Página 1
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {notebookPages.map((page) => {
              const isSelected = selectedPageIds.includes(page.id);

              return (
                <div
                  key={page.id}
                  onClick={() => handleOpenPage(page.id)}
                  className={`group relative bg-white dark:bg-gray-800 rounded-lg border cursor-pointer overflow-hidden shadow-xs transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  {/* Select Checkbox at top left */}
                  <div
                    onClick={(e) => toggleSelectPage(page.id, e)}
                    className="absolute top-2 left-2 z-10 p-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xs rounded-md shadow-xs hover:scale-110 transition-transform"
                  >
                    {isSelected ? (
                      <FileCheck size={16} className="text-blue-600" />
                    ) : (
                      <div className="w-4 h-4 rounded border border-gray-400 dark:border-gray-500 opacity-60 group-hover:opacity-100" />
                    )}
                  </div>

                  {/* Thumbnail Preview representation */}
                  <div className="h-44 bg-gray-50 dark:bg-gray-900/60 p-3 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Simulated mini notebook lines */}
                    <div className="w-full h-full border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 p-2 flex flex-col gap-1.5 shadow-2xs">
                      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-1" />
                      <div className="h-0.5 bg-gray-100 dark:bg-gray-700/60 rounded w-full" />
                      <div className="h-0.5 bg-gray-100 dark:bg-gray-700/60 rounded w-full" />
                      <div className="h-0.5 bg-gray-100 dark:bg-gray-700/60 rounded w-4/5" />
                      <div className="h-0.5 bg-gray-100 dark:bg-gray-700/60 rounded w-full" />
                      <div className="h-0.5 bg-gray-100 dark:bg-gray-700/60 rounded w-3/4" />

                      {/* Stroke count indicator */}
                      <div className="mt-auto text-[9px] text-gray-400 font-mono text-center">
                        {page.strokes.length} {page.strokes.length === 1 ? 'traço' : 'traços'}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Info */}
                  <div className="p-2.5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        Página {page.pageNumber}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="uppercase font-mono">{page.format}</span>
                        <span>•</span>
                        <span className="capitalize">{page.pattern}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDuplicate(e, page.id)}
                        title="Duplicar Página"
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, page.id, page.pageNumber)}
                        title="Excluir Página"
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

