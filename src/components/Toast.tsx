import React from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const toasts = useCanvasStore((s) => s.toasts);
  const dismissToast = useCanvasStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClass = 'border-gray-300 bg-white text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          colorClass = 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200';
        } else if (toast.type === 'warning') {
          Icon = AlertCircle;
          colorClass = 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-md border shadow-md text-sm font-medium transition-all duration-150 transform translate-y-0 opacity-100 ${colorClass}`}
          >
            <Icon size={16} className="shrink-0" />
            <span>{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

