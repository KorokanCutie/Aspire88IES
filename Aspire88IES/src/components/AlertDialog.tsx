import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function AlertDialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = 'Procced',
  cancelText = 'Cancel',
  isDestructive = false,
}: AlertDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                isDestructive 
                  ? 'bg-rose-950/40 border-rose-800/40 text-rose-400' 
                  : 'bg-indigo-950/40 border-indigo-800/40 text-indigo-400'
              }`}>
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold tracking-tight text-slate-100">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl hover:bg-slate-800/60 transition-colors focus:ring-2 focus:ring-slate-700 focus:outline-none"
              >
                {cancelText}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-slate-950 shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all focus:ring-2 focus:outline-none ${
                  isDestructive
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 focus:ring-rose-500'
                    : 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 focus:ring-emerald-400'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default AlertDialog;
