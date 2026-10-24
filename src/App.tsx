import React, { useEffect, useState } from 'react';
import { useNotebookStore } from './store/useNotebookStore';
import { useCanvasStore } from './store/useCanvasStore';
import { initializeDatabase } from './db';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CanvasContainer } from './components/Canvas/CanvasContainer';
import { DashboardView } from './components/Dashboard/DashboardView';
import { PageGridView } from './components/PageGrid/PageGridView';
import { NewSubjectModal } from './components/Modals/NewSubjectModal';
import { NewNotebookModal } from './components/Modals/NewNotebookModal';
import { ExportModal } from './components/Modals/ExportModal';
import { CalibrationModal } from './components/Modals/CalibrationModal';
import { ToastContainer } from './components/Toast';

export const App: React.FC = () => {
  const loadData = useNotebookStore((s) => s.loadData);
  const viewMode = useNotebookStore((s) => s.viewMode);
  const isLoading = useNotebookStore((s) => s.isLoading);
  const isDark = useCanvasStore((s) => s.isDark);

  // Modal states
  const [isNewSubjectOpen, setIsNewSubjectOpen] = useState(false);
  const [isNewNotebookOpen, setIsNewNotebookOpen] = useState(false);
  const [targetSubjectIdForNotebook, setTargetSubjectIdForNotebook] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeDatabase();
      await loadData();
    }
    init();
  }, [loadData]);

  const handleOpenNewNotebook = (subjectId: string) => {
    setTargetSubjectIdForNotebook(subjectId);
    setIsNewNotebookOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-500 font-medium text-sm">
        Carregando seus cadernos de estudo...
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${isDark ? 'dark' : ''}`}>
      <div className="h-full w-full flex flex-col bg-app-light dark:bg-app-dark text-gray-900 dark:text-gray-100">
        {/* Top Header */}
        <Header
          onOpenExport={() => setIsExportOpen(true)}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
        />

        {/* Main Content Area: Sidebar + Active Screen */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Collapsible Sidebar (visible in Studio & Grid modes) */}
          {viewMode !== 'dashboard' && (
            <Sidebar
              onOpenNewSubject={() => setIsNewSubjectOpen(true)}
              onOpenNewNotebook={handleOpenNewNotebook}
            />
          )}

          {/* Screen Routing */}
          <main className="flex-1 flex flex-col overflow-hidden relative">
            {viewMode === 'dashboard' && (
              <DashboardView
                onOpenNewSubject={() => setIsNewSubjectOpen(true)}
                onOpenNewNotebook={handleOpenNewNotebook}
              />
            )}

            {viewMode === 'grid' && <PageGridView />}

            {viewMode === 'studio' && <CanvasContainer />}
          </main>
        </div>

        {/* Floating Non-blocking Toast Alerts */}
        <ToastContainer />

        {/* Modals */}
        <NewSubjectModal
          open={isNewSubjectOpen}
          onOpenChange={setIsNewSubjectOpen}
        />

        <NewNotebookModal
          open={isNewNotebookOpen}
          onOpenChange={setIsNewNotebookOpen}
          subjectId={targetSubjectIdForNotebook}
        />

        <ExportModal
          open={isExportOpen}
          onOpenChange={setIsExportOpen}
        />

        <CalibrationModal
          open={isCalibrationOpen}
          onOpenChange={setIsCalibrationOpen}
        />
      </div>
    </div>
  );
};

export default App;

