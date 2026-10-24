import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Image as ImageIcon, Database, Download } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { exportPagesToPDF } from '../../engine/pdfExport';
import { db } from '../../db';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ open, onOpenChange }) => {
  const [exportType, setExportType] = useState<'pdf' | 'png' | 'backup'>('pdf');
  const [pageRange, setPageRange] = useState<'all' | 'current'>('all');
  const [includeBackground, setIncludeBackground] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const activePageId = useNotebookStore((s) => s.activePageId);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const pages = useNotebookStore((s) => s.pages);
  const isDark = useCanvasStore((s) => s.isDark);
  const showToast = useCanvasStore((s) => s.showToast);

  const currentNotebook = notebooks.find((nb) => nb.id === activeNotebookId);
  const currentNotebookPages = pages.filter((p) => p.notebookId === activeNotebookId);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportType === 'pdf') {
        const pagesToExport =
          pageRange === 'all'
            ? currentNotebookPages
            : currentNotebookPages.filter((p) => p.id === activePageId);

        if (pagesToExport.length === 0) {
          showToast('Nenhuma página para exportar', 'warning');
          return;
        }

        await exportPagesToPDF({
          includeBackground,
          isDark,
          pages: pagesToExport,
          title: currentNotebook?.title || 'Caderno de Estudos',
        });
        showToast('PDF compilado e baixado com sucesso!', 'success');
        onOpenChange(false);
      } else if (exportType === 'backup') {
        const allSubjects = await db.subjects.toArray();
        const allNotebooks = await db.notebooks.toArray();
        const allPages = await db.pages.toArray();

        const backupData = {
          version: 1,
          exportedAt: new Date().toISOString(),
          subjects: allSubjects,
          notebooks: allNotebooks,
          pages: allPages,
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_caderno_estudos_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup completo baixado com sucesso!', 'success');
        onOpenChange(false);
      } else if (exportType === 'png') {
        // Trigger canvas capture
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = `pagina_${activePageId || 'estudo'}.png`;
          a.click();
          showToast('Imagem PNG da página baixada!', 'success');
          onOpenChange(false);
        }
      }
    } catch (err) {
      console.error('Erro na exportação:', err);
      showToast('Erro ao realizar exportação', 'warning');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity duration-150" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 transition-all duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Exportar Caderno e Backup
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            {/* Format Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-2">
                Formato de Saída
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportType('pdf')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-md border text-xs font-medium transition-colors ${
                    exportType === 'pdf'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <FileText size={20} />
                  <span>PDF Documento</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportType('png')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-md border text-xs font-medium transition-colors ${
                    exportType === 'png'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <ImageIcon size={20} />
                  <span>Imagem PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportType('backup')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-md border text-xs font-medium transition-colors ${
                    exportType === 'backup'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Database size={20} />
                  <span>Backup JSON</span>
                </button>
              </div>
            </div>

            {/* Options for PDF */}
            {exportType === 'pdf' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                    Intervalo de Páginas
                  </label>
                  <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pageRange"
                        checked={pageRange === 'all'}
                        onChange={() => setPageRange('all')}
                        className="text-blue-600"
                      />
                      <span>Todas as páginas ({currentNotebookPages.length})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pageRange"
                        checked={pageRange === 'current'}
                        onChange={() => setPageRange('current')}
                        className="text-blue-600"
                      />
                      <span>Página atual apenas</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBackground}
                      onChange={(e) => setIncludeBackground(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Incluir linhas pautadas ou quadriculado de fundo no PDF</span>
                  </label>
                </div>
              </div>
            )}

            {exportType === 'backup' && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-400">
                Gera um arquivo completo com todas as suas matérias, cadernos e traços vetoriais salvos no navegador. Útil para transferir dados ou guardar cópia externa de segurança.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs"
              >
                <Download size={16} />
                <span>{isExporting ? 'Exportando...' : 'Confirmar e Baixar'}</span>
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

