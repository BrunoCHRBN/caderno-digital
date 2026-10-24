import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  ArrowRight,
  Folder,
  Trash2,
  FolderPlus,
  Pencil,
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useCanvasStore } from '../../store/useCanvasStore';

interface DashboardViewProps {
  onOpenNewSubject: () => void;
  onOpenNewNotebook: (subjectId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewSubject,
  onOpenNewNotebook,
}) => {
  const subjects = useNotebookStore((s) => s.subjects);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const pages = useNotebookStore((s) => s.pages);
  const setActiveSubject = useNotebookStore((s) => s.setActiveSubject);
  const setActiveNotebook = useNotebookStore((s) => s.setActiveNotebook);
  const setActivePage = useNotebookStore((s) => s.setActivePage);
  const setViewMode = useNotebookStore((s) => s.setViewMode);
  const deleteSubject = useNotebookStore((s) => s.deleteSubject);
  const updateSubject = useNotebookStore((s) => s.updateSubject);
  const updateNotebook = useNotebookStore((s) => s.updateNotebook);
  const openLastPageOfSubject = useNotebookStore((s) => s.openLastPageOfSubject);
  const showToast = useCanvasStore((s) => s.showToast);

  const [search, setSearch] = useState('');

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter((s) => {
    const matchesName = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesCode = s.code?.toLowerCase().includes(search.toLowerCase());
    const subjectNbs = notebooks.filter((nb) => nb.subjectId === s.id);
    const matchesNotebook = subjectNbs.some((nb) =>
      nb.title.toLowerCase().includes(search.toLowerCase())
    );
    return matchesName || matchesCode || matchesNotebook;
  });

  const handleOpenNotebook = (subjectId: string, notebookId: string) => {
    setActiveSubject(subjectId);
    setActiveNotebook(notebookId);

    const nbPages = pages.filter((p) => p.notebookId === notebookId);
    if (nbPages.length > 0) {
      setActivePage(nbPages[0].id);
      setViewMode('studio');
    } else {
      setViewMode('grid');
    }
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

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Excluir a matéria "${name}" e todos os seus cadernos permanentemente?`)) {
      await deleteSubject(id);
      showToast(`Matéria "${name}" removida`, 'info');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top bar of Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
              <span>Painel de Estudos</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Organização de matérias e cadernos com anotações manuscritas
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar matéria ou caderno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>

            <button
              onClick={onOpenNewSubject}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors"
            >
              <Plus size={15} />
              <span>Nova Matéria</span>
            </button>
          </div>
        </div>

        {/* Subjects Cards Grid */}
        {filteredSubjects.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-8">
            <BookOpen className="mx-auto text-gray-400 mb-2" size={32} />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nenhuma matéria encontrada
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Crie suas disciplinas acadêmicas para começar a organizar suas anotações de estudo.
            </p>
            <button
              onClick={onOpenNewSubject}
              className="mt-4 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
            >
              Criar Primeira Matéria
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSubjects.map((subject) => {
              const subjectNotebooks = notebooks.filter((nb) => nb.subjectId === subject.id);
              const subjectPages = pages.filter((p) =>
                subjectNotebooks.some((nb) => nb.id === p.notebookId)
              );

              return (
                <div
                  key={subject.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-xs hover:border-gray-300 dark:hover:border-gray-600 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Subject Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <div>
                          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                            {subject.name}
                          </h2>
                          {subject.code && (
                            <span className="text-[10px] font-mono text-gray-400">
                              {subject.code}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleRenameSubject(e, subject.id, subject.name)}
                          title="Renomear Matéria"
                          className="text-gray-400 hover:text-blue-600 p-1 rounded-md"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, subject.id, subject.name)}
                          title="Excluir Matéria"
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mt-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <span>{subjectNotebooks.length} cadernos</span>
                      <span>•</span>
                      <span>{subjectPages.length} páginas totais</span>
                    </div>

                    {/* Notebooks List */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        <span>Cadernos / Tópicos</span>
                        <button
                          onClick={() => onOpenNewNotebook(subject.id)}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 normal-case"
                        >
                          <FolderPlus size={12} />
                          <span>Adicionar</span>
                        </button>
                      </div>

                      {subjectNotebooks.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-1">
                          Nenhum caderno criado nesta matéria.
                        </p>
                      ) : (
                        subjectNotebooks.slice(0, 4).map((nb) => {
                          const nbPages = pages.filter((p) => p.notebookId === nb.id);
                          return (
                            <div
                              key={nb.id}
                              onClick={() => handleOpenNotebook(subject.id, nb.id)}
                              className="group flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Folder size={14} className="text-gray-400 group-hover:text-blue-600 shrink-0" />
                                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                  {nb.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-gray-400">
                                  {nbPages.length} pág
                                </span>
                                <button
                                  onClick={(e) => handleRenameNotebook(e, nb.id, nb.title)}
                                  title="Renomear Caderno"
                                  className="text-gray-400 hover:text-blue-600 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Pencil size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Card Action: Continuar Estudando */}
                  {subjectNotebooks.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => openLastPageOfSubject(subject.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                      >
                        <Clock size={13} />
                        <span>Continuar Estudando</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

