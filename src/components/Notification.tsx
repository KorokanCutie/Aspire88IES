/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface NotificationProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function Notification({ toasts, onClose }: NotificationProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full" id="toasts-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onClose }: { key?: string; toast: ToastMessage; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000); // Auto close after 5 seconds
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const config = {
    success: {
      bg: 'bg-slate-900 border-emerald-500/20 text-emerald-400',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" id={`success-icon-${toast.id}`} />
    },
    error: {
      bg: 'bg-slate-900 border-rose-500/20 text-rose-400',
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" id={`error-icon-${toast.id}`} />
    },
    info: {
      bg: 'bg-slate-900 border-sky-500/20 text-sky-400',
      icon: <Info className="w-5 h-5 text-sky-500" id={`info-icon-${toast.id}`} />
    }
  }[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg} shadow-2xl backdrop-blur-md`}
      id={`toast-${toast.id}`}
    >
      <div className="mt-0.5" id={`toast-icon-${toast.id}`}>
        {config.icon}
      </div>
      <div className="flex-1 text-sm font-medium text-slate-200 leading-relaxed" id={`toast-text-${toast.id}`}>
        {toast.text}
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-200 transition p-0.5 hover:bg-slate-800 rounded"
        id={`toast-close-${toast.id}`}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
