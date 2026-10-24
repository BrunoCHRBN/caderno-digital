import { create } from 'zustand';
import { ToolType, PressureCurve, ToolbarPosition, Stroke } from '../types/canvas';
import { db } from '../db';
import { useNotebookStore } from './useNotebookStore';

interface ToastData {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
}

interface CanvasState {
  tool: ToolType;
  color: string;
  size: number;
  prevTool: ToolType;
  pressureCurve: PressureCurve;
  toolbarPosition: ToolbarPosition;
  isDark: boolean;
  zenMode: boolean;
  isSidebarOpen: boolean;
  isDrawing: boolean;
  autoShapeDetection: boolean;

  // Pan & Zoom for Infinite Canvas and A4 viewport
  pan: { x: number; y: number };
  zoom: number;

  // Undo / Redo history
  undoStack: Stroke[][];
  redoStack: Stroke[][];

  // Toast notifications
  toasts: ToastData[];

  // Registered canvas actions
  canvasActions: {
    undo: (() => void) | null;
    redo: (() => void) | null;
    clear: (() => void) | null;
  };

  setCanvasActions: (actions: {
    undo: (() => void) | null;
    redo: (() => void) | null;
    clear: (() => void) | null;
  }) => void;

  // Actions
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setTemporaryEraser: (active: boolean) => void;
  setPressureCurve: (curve: PressureCurve) => void;
  setToolbarPosition: (pos: ToolbarPosition) => void;
  toggleDarkMode: () => void;
  toggleZenMode: () => void;
  toggleSidebar: () => void;
  toggleAutoShapeDetection: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  resetViewport: () => void;

  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  dismissToast: (id: string) => void;

  // Stroke operations
  saveCurrentStrokes: (strokes: Stroke[]) => Promise<void>;
  undo: (currentStrokes: Stroke[]) => Stroke[] | null;
  redo: (currentStrokes: Stroke[]) => Stroke[] | null;
  pushHistory: (strokes: Stroke[]) => void;
  clearHistory: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  tool: 'pen',
  color: '#111827',
  size: 3,
  prevTool: 'pen',
  pressureCurve: 'normal',
  toolbarPosition: 'bottom',
  isDark: false,
  zenMode: false,
  isSidebarOpen: true,
  isDrawing: false,
  autoShapeDetection: true,

  pan: { x: 0, y: 0 },
  zoom: 1,

  undoStack: [],
  redoStack: [],
  toasts: [],
  canvasActions: { undo: null, redo: null, clear: null },

  setCanvasActions: (actions) => set({ canvasActions: actions }),

  setTool: (tool) => set({ tool, prevTool: tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),

  setTemporaryEraser: (active) => {
    if (active) {
      const current = get().tool;
      if (current !== 'eraser') {
        set({ prevTool: current, tool: 'eraser' });
      }
    } else {
      set((state) => ({ tool: state.prevTool }));
    }
  },

  setPressureCurve: (pressureCurve) => set({ pressureCurve }),
  setToolbarPosition: (toolbarPosition) => set({ toolbarPosition }),
  toggleDarkMode: () => set((state) => ({ isDark: !state.isDark })),
  toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleAutoShapeDetection: () =>
    set((state) => ({ autoShapeDetection: !state.autoShapeDetection })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),

  setPan: (updater) =>
    set((state) => ({
      pan: typeof updater === 'function' ? updater(state.pan) : updater,
    })),

  setZoom: (updater) =>
    set((state) => {
      const newZoom = typeof updater === 'function' ? updater(state.zoom) : updater;
      // Clamp zoom between 0.25 and 4.0
      return { zoom: Math.min(Math.max(newZoom, 0.25), 4.0) };
    }),

  resetViewport: () => set({ pan: { x: 0, y: 0 }, zoom: 1 }),

  showToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    setTimeout(() => {
      get().dismissToast(id);
    }, 3200);
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  saveCurrentStrokes: async (strokes) => {
    const activePageId = useNotebookStore.getState().activePageId;
    if (!activePageId) return;

    try {
      await db.pages.update(activePageId, {
        strokes,
        updatedAt: Date.now(),
      });
      useNotebookStore.getState().updatePageMeta(activePageId, { strokes });
    } catch (err) {
      console.error('Falha ao salvar traços no banco local:', err);
    }
  },

  pushHistory: (strokes) => {
    set((state) => ({
      undoStack: [...state.undoStack, strokes],
      redoStack: [], // clear redo on new action
    }));
  },

  undo: (currentStrokes) => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;

    const previous = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [currentStrokes, ...redoStack],
    });
    return previous;
  },

  redo: (currentStrokes) => {
    const { redoStack, undoStack } = get();
    if (redoStack.length === 0) return null;

    const next = redoStack[0];
    set({
      redoStack: redoStack.slice(1),
      undoStack: [...undoStack, currentStrokes],
    });
    return next;
  },

  clearHistory: () => set({ undoStack: [], redoStack: [] }),
}));
