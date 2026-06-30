import { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove toast after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const nonErrorToasts = toasts.filter((t) => t.type !== 'error');
  const errorToasts = toasts.filter((t) => t.type === 'error');

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Absolute, screen-pinned toast container (Centered) */}
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none p-4">
        <div className="max-w-sm w-full flex flex-col gap-2.5 pointer-events-none">
          <AnimatePresence>
            {nonErrorToasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 pointer-events-auto backdrop-blur-md ${
                  t.type === 'success'
                    ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-100'
                    : 'bg-slate-900/95 border-indigo-500/30 text-indigo-100'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {t.type === 'info' && <Info className="w-5 h-5 text-indigo-400" />}
                </div>
                
                <div className="flex-1 text-sm font-medium tracking-wide">
                  {t.message}
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 p-0.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Screen-pinned, centered container for Prompt Error Messages */}
      {errorToasts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs pointer-events-auto cursor-pointer"
            onClick={() => errorToasts.forEach((t) => removeToast(t.id))}
            title="Dismiss error message"
          />
          <div className="relative z-50 flex flex-col gap-3.5 max-w-md w-full pointer-events-none">
            <AnimatePresence>
              {errorToasts.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="p-5 rounded-2xl shadow-2xl border-2 border-rose-500/30 bg-slate-900/95 text-rose-100 flex items-start gap-4 pointer-events-auto backdrop-blur-md"
                >
                  <div className="mt-0.5 shrink-0 p-1.5 bg-rose-950/50 border border-rose-500/20 rounded-xl text-rose-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 space-y-1 text-left font-sans">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-405 text-rose-400">System Prompt Error</h4>
                    <p className="text-xs font-semibold leading-relaxed text-slate-200">
                      {t.message}
                    </p>
                  </div>

                  <button
                    onClick={() => removeToast(t.id)}
                    className="shrink-0 p-1 rounded-lg hover:bg-rose-950 hover:text-rose-200 text-rose-400 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
export default ToastProvider;
