/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = {
    danger: {
      icon: <AlertCircle className="w-8 h-8 text-rose-500" id="icon-danger" />,
      border: 'border-rose-500/20',
      btn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20',
      bg: 'bg-rose-500/10'
    },
    warning: {
      icon: <HelpCircle className="w-8 h-8 text-amber-500" id="icon-warning" />,
      border: 'border-amber-500/20',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20',
      bg: 'bg-amber-500/10'
    },
    success: {
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" id="icon-success" />,
      border: 'border-emerald-500/20',
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20',
      bg: 'bg-emerald-500/10'
    },
    info: {
      icon: <AlertCircle className="w-8 h-8 text-sky-500" id="icon-info" />,
      border: 'border-sky-500/20',
      btn: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/20',
      bg: 'bg-sky-500/10'
    }
  }[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="confirm-modal-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          id="confirm-modal-backdrop"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 border ${colors.border} p-6 shadow-2xl`}
          id="confirm-modal-box"
        >
          <div className="flex items-start gap-4" id="confirm-modal-header">
            <div className={`p-3 rounded-xl ${colors.bg}`} id="confirm-modal-icon-container">
              {colors.icon}
            </div>
            <div className="flex-1" id="confirm-modal-text-content">
              <h3 className="text-lg font-semibold text-slate-100 tracking-tight" id="confirm-modal-title">
                {title}
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed" id="confirm-modal-message">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3" id="confirm-modal-actions">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition"
              id="confirm-modal-cancel-btn"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg ${colors.btn}`}
              id="confirm-modal-confirm-btn"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
