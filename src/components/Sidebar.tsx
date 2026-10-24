import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  FolderPlus,
  FilePlus,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
  Pencil,
} from 'lucide-react';
import { useNotebookStore } from '../store/useNotebookStore';
import { useCanvasStore } from '../store/useCanvasStore';

interface SidebarProps {
  onOpenNewSubject: () => void;
  onOpenNewNotebook: (subjectId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenNewSubject,
  onOpenNewNotebook,
}) => {
  const subjects = useNotebookStore((s) => s.subjects);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const pages = useNotebookStore((s) => s.pages);
  const activeSubjectId = useNotebookStore((s) => s.activeSubjectId);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const activePageId = useNotebookStore((s) => s.activePageId);
  const setActiveSubject = useNotebookStore((s) => s.setActiveSubject);
  const setActiveNotebook = useNotebookStore((s) => s.setActiveNotebook);
  const setActivePage = useNotebookStore((s) => s.setActivePage);
  const setViewMode = useNotebookStore((s) => s.setViewMode);
  const createPage = useNotebookStore((s) => s.createPage);
  const updateSubject = useNotebookStore((s) => s.updateSubject);
  const updateNotebook = useNotebookStore((s) => s.updateNotebook);
  const deleteSubject = useNotebookStore((s) => s.deleteSubject);
  const deleteNotebook = useNotebookStore((s) => s.deleteNotebook);

  const isSidebarOpen = useCanvasStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useCanvasStore((s) => s.setSidebarOpen);
  const zenMode = useCanvasStore((s) => s.zenMode);
  const showToast = useCanvasStore((s) => s.showToast);

  // Expanded subject sections state
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    [activeSubjectId || '']: true,
  });

  const toggleSubjectExpanded = (id: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectNotebook = (subjectId: string, notebookId: string) => {
    setActiveSubject(subjectId);
    setActiveNotebook(notebookId);

    const nbPages = pages.filter((p) => p.notebookId === notebookId);
    if (nbPages.length > 0) {
      setActivePage(nbPages[0].id);
      setViewMode('studio');
    } else {
      // Create first page if none exists
      createPage(notebookId).then((newPageId) => {
        setActivePage(newPageId);
        setViewMode('studio');
      });
    }
  };

  const handleSelectPage = (subjectId: string, notebookId: string, pageId: string) => {
    setActiveSubject(subjectId);
    setActiveNotebook(notebookId);
    setActivePage(pageId);
    setViewMode('studio');
  };

  const handleAddNewPage = async (notebookId: string) => {
    const newPageId = await createPage(notebookId);
    setActivePage(newPageId);
    setViewMode('studio');
    showToast('Nova página criada no caderno', 'success');
  };

  const handleRenameSubject = async (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    const newName = window.prompt('Renomear matéria:', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      await updateSubject(id, newName.trim());
      showToast('Matéria renomeada', 'success');
    }
  };

  const handleRenameNotebook = async (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    const newTitle = window.prompt('Renomear caderno:', currentTitle);
    if (newTitle && newTitle.trim() && newTitle.trim() !== currentTitle) {
      await updateNotebook(id, newTitle.trim());
      showToast('Caderno renomeado', 'success');
    }
  };

  const handleDeleteSubject = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir a matéria "${name}" e todos os seus cadernos?`)) {
      await deleteSubject(id);
      showToast(`Matéria "${name}" excluída`, 'info');
    }
  };

  const handleDeleteNotebook = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir o caderno "${title}"?`)) {
      await deleteNotebook(id);
      showToast(`Caderno "${title}" excluído`, 'info');
    }
  };

  if (zenMode || !isSidebarOpen) return null;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 select-none z-20 h-full transition-all duration-150">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Minhas Matérias
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNewSubject}
            title="Adicionar Nova Matéria"
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            title="Fechar Barra Lateral"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 md:hidden"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Subjects & Notebooks Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {subjects.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400">
            Nenhuma matéria criada. Clique no botão + acima para começar.
          </div>
        ) : (
          subjects.map((subject) => {
            const isExpanded = expandedSubjects[subject.id] ?? (subject.id === activeSubjectId);
            const subjectNotebooks = notebooks.filter((nb) => nb.subjectId === subject.id);

            return (
              <div key={subject.id} className="rounded-md overflow-hidden">
                {/* Subject Header Row */}
                <div
                  onClick={() => toggleSubjectExpanded(subject.id)}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-xs font-semibold transition-colors ${
                    activeSubjectId === subject.id
                      ? 'bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isExpanded ? <ChevronDown size={14} className="shrink-0 text-gray-400" /> : <ChevronRight size={14} className="shrink-0 text-gray-400" />}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="truncate">{subject.name}</span>
                  </div>

                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleRenameSubject(e, subject.id, subject.name)}
                      title="Renomear Matéria"
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewNotebook(subject.id);
                      }}
                      title="Adicionar Caderno neste Tópico"
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <FolderPlus size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSubject(e, subject.id, subject.name)}
                      title="Excluir Matéria"
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Notebooks of this subject */}
                {isExpanded && (
                  <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-700 my-1 space-y-0.5">
                    {subjectNotebooks.length === 0 ? (
                      <button
                        onClick={() => onOpenNewNotebook(subject.id)}
                        className="w-full text-left py-1 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>Criar primeiro caderno</span>
                      </button>
                    ) : (
                      subjectNotebooks.map((nb) => {
                        const isNotebookActive = activeNotebookId === nb.id;
                        const notebookPages = pages.filter((p) => p.notebookId === nb.id);

                        return (
                          <div key={nb.id} className="space-y-0.5">
                            <div
                              onClick={() => handleSelectNotebook(subject.id, nb.id)}
                              className={`group flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                isNotebookActive
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                              }`}
                            >
                              <span className="truncate">{nb.title}</span>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {notebookPages.length}p
                                </span>
                                <button
                                  onClick={(e) => handleRenameNotebook(e, nb.id, nb.title)}
                                  title="Renomear Caderno"
                                  className="p-0.5 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddNewPage(nb.id);
                                  }}
                                  title="Adicionar Página"
                                  className="p-0.5 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <FilePlus size={12} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteNotebook(e, nb.id, nb.title)}
                                  title="Excluir Caderno"
                                  className="p-0.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Pages sub-list if this notebook is active */}
                            {isNotebookActive && notebookPages.length > 0 && (
                              <div className="ml-2 pl-2 border-l border-blue-200 dark:border-blue-900 space-y-0.5 py-0.5">
                                {notebookPages.map((page) => (
                                  <div
                                    key={page.id}
                                    onClick={() => handleSelectPage(subject.id, nb.id, page.id)}
                                    className={`px-2 py-0.5 rounded text-[11px] cursor-pointer flex items-center justify-between ${
                                      activePageId === page.id
                                        ? 'bg-blue-100 dark:bg-blue-900/80 text-blue-900 dark:text-blue-100 font-semibold'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/40'
                                    }`}
                                  >
                                    <span>Página {page.pageNumber}</span>
                                    <span className="text-[9px] uppercase tracking-wide text-gray-400">
                                      {page.format}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer of Sidebar */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span>Atalhos: <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">B</kbd> Caneta <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">E</kbd> Borracha</span>
      </div>
    </aside>
  );
};

