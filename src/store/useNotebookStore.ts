import { create } from 'zustand';
import { db } from '../db';
import { Subject, Notebook, PageData } from '../types/notebook';
import { ViewMode, PageFormat, BackgroundPattern } from '../types/canvas';

interface NotebookState {
  subjects: Subject[];
  notebooks: Notebook[];
  pages: PageData[];
  activeSubjectId: string | null;
  activeNotebookId: string | null;
  activePageId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  isLoading: boolean;

  // Actions
  loadData: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setActiveSubject: (subjectId: string | null) => void;
  setActiveNotebook: (notebookId: string | null) => void;
  setActivePage: (pageId: string | null) => void;

  createSubject: (name: string, code?: string, color?: string) => Promise<string>;
  updateSubject: (id: string, name: string, code?: string, color?: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  createNotebook: (subjectId: string, title: string) => Promise<string>;
  updateNotebook: (id: string, title: string) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  createPage: (notebookId: string, format?: PageFormat, pattern?: BackgroundPattern) => Promise<string>;
  deletePage: (id: string) => Promise<void>;
  duplicatePage: (id: string) => Promise<string>;
  updatePageMeta: (id: string, updates: Partial<PageData>) => Promise<void>;
  openLastPageOfSubject: (subjectId: string) => Promise<void>;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  subjects: [],
  notebooks: [],
  pages: [],
  activeSubjectId: null,
  activeNotebookId: null,
  activePageId: null,
  viewMode: 'dashboard',
  searchQuery: '',
  isLoading: true,

  loadData: async () => {
    try {
      const subjects = await db.subjects.toArray();
      const notebooks = await db.notebooks.toArray();
      const pages = await db.pages.toArray();

      set({
        subjects,
        notebooks,
        pages,
        isLoading: false,
        activeSubjectId: subjects[0]?.id || null,
        activeNotebookId: notebooks[0]?.id || null,
        activePageId: pages[0]?.id || null
      });
    } catch (err) {
      console.error('Erro ao carregar dados do banco:', err);
      set({ isLoading: false });
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveSubject: (subjectId) => set({ activeSubjectId: subjectId }),
  setActiveNotebook: (notebookId) => set({ activeNotebookId: notebookId }),
  setActivePage: (pageId) => set({ activePageId: pageId }),

  createSubject: async (name, code = '', color = '#1D4ED8') => {
    const id = `sub-${Date.now()}`;
    const now = Date.now();
    const newSubject: Subject = { id, name, code, color, createdAt: now, updatedAt: now };

    await db.subjects.add(newSubject);
    set((state) => ({ subjects: [...state.subjects, newSubject] }));
    return id;
  },

  updateSubject: async (id, name, code = '', color) => {
    const existing = await db.subjects.get(id);
    if (!existing) return;
    const updated: Subject = {
      ...existing,
      name,
      code,
      color: color || existing.color,
      updatedAt: Date.now(),
    };
    await db.subjects.update(id, updated);
    set((state) => ({
      subjects: state.subjects.map((s) => (s.id === id ? updated : s)),
    }));
  },

  deleteSubject: async (id) => {
    // Delete subject and associated notebooks/pages
    const notebooksToDelete = await db.notebooks.where('subjectId').equals(id).toArray();
    for (const nb of notebooksToDelete) {
      await db.pages.where('notebookId').equals(nb.id).delete();
    }
    await db.notebooks.where('subjectId').equals(id).delete();
    await db.subjects.delete(id);

    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
      notebooks: state.notebooks.filter((nb) => nb.subjectId !== id),
      activeSubjectId: state.activeSubjectId === id ? null : state.activeSubjectId
    }));
  },

  createNotebook: async (subjectId, title) => {
    const id = `nb-${Date.now()}`;
    const now = Date.now();
    const newNotebook: Notebook = { id, subjectId, title, createdAt: now, updatedAt: now };

    await db.notebooks.add(newNotebook);
    // Also create first page for this notebook
    const pageId = `page-${Date.now()}`;
    const firstPage: PageData = {
      id: pageId,
      notebookId: id,
      pageNumber: 1,
      format: 'a4',
      pattern: 'lined',
      strokes: [],
      createdAt: now,
      updatedAt: now
    };
    await db.pages.add(firstPage);

    set((state) => ({
      notebooks: [...state.notebooks, newNotebook],
      pages: [...state.pages, firstPage],
      activeNotebookId: id,
      activePageId: pageId
    }));
    return id;
  },

  updateNotebook: async (id, title) => {
    const existing = await db.notebooks.get(id);
    if (!existing) return;
    const updated: Notebook = {
      ...existing,
      title,
      updatedAt: Date.now(),
    };
    await db.notebooks.update(id, updated);
    set((state) => ({
      notebooks: state.notebooks.map((nb) => (nb.id === id ? updated : nb)),
    }));
  },

  deleteNotebook: async (id) => {
    await db.pages.where('notebookId').equals(id).delete();
    await db.notebooks.delete(id);

    set((state) => ({
      notebooks: state.notebooks.filter((nb) => nb.id !== id),
      pages: state.pages.filter((p) => p.notebookId !== id),
      activeNotebookId: state.activeNotebookId === id ? null : state.activeNotebookId
    }));
  },

  createPage: async (notebookId, format = 'a4', pattern = 'lined') => {
    const existing = await db.pages.where('notebookId').equals(notebookId).toArray();
    const pageNumber = existing.length + 1;
    const now = Date.now();
    const pageId = `page-${Date.now()}`;

    const newPage: PageData = {
      id: pageId,
      notebookId,
      pageNumber,
      format,
      pattern,
      strokes: [],
      createdAt: now,
      updatedAt: now
    };

    await db.pages.add(newPage);
    set((state) => ({
      pages: [...state.pages, newPage],
      activePageId: pageId
    }));
    return pageId;
  },

  deletePage: async (id) => {
    await db.pages.delete(id);
    set((state) => {
      const remaining = state.pages.filter((p) => p.id !== id);
      const nextActive = remaining.length > 0 ? remaining[0].id : null;
      return {
        pages: remaining,
        activePageId: state.activePageId === id ? nextActive : state.activePageId
      };
    });
  },

  duplicatePage: async (id) => {
    const original = await db.pages.get(id);
    if (!original) throw new Error('Página não encontrada');

    const existing = await db.pages.where('notebookId').equals(original.notebookId).toArray();
    const pageNumber = existing.length + 1;
    const now = Date.now();
    const newPageId = `page-${Date.now()}`;

    const newPage: PageData = {
      ...original,
      id: newPageId,
      pageNumber,
      strokes: JSON.parse(JSON.stringify(original.strokes)),
      createdAt: now,
      updatedAt: now
    };

    await db.pages.add(newPage);
    set((state) => ({
      pages: [...state.pages, newPage],
      activePageId: newPageId
    }));
    return newPageId;
  },

  updatePageMeta: async (id, updates) => {
    await db.pages.update(id, { ...updates, updatedAt: Date.now() });
    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p))
    }));
  },

  openLastPageOfSubject: async (subjectId) => {
    const subjectNotebooks = get().notebooks.filter((nb) => nb.subjectId === subjectId);
    if (subjectNotebooks.length === 0) return;

    // Sort by recent updatedAt
    const sortedNb = [...subjectNotebooks].sort((a, b) => b.updatedAt - a.updatedAt);
    const targetNb = sortedNb[0];

    const notebookPages = get().pages.filter((p) => p.notebookId === targetNb.id);
    if (notebookPages.length === 0) return;

    const sortedPages = [...notebookPages].sort((a, b) => b.updatedAt - a.updatedAt);
    const targetPage = sortedPages[0];

    set({
      activeSubjectId: subjectId,
      activeNotebookId: targetNb.id,
      activePageId: targetPage.id,
      viewMode: 'studio'
    });
  }
}));

