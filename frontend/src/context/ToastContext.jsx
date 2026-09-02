'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle
} from 'lucide-react'

const ToastContext = createContext({
  showToast: () => {},
  toast: {
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {}
  },
  showConfirm: () => {}
})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmModal, setConfirmModal] = useState(null)

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    if (!message) return
    const id = Date.now() + Math.random().toString(36).substring(2, 7)
    
    // Normalize string messages supporting arrays, FastAPI validation objects, etc.
    let text = ''
    if (typeof message === 'string') {
      text = message
    } else if (Array.isArray(message)) {
      text = message.map((m) => m?.message || m?.msg || (typeof m === 'string' ? m : JSON.stringify(m))).join(', ')
    } else if (message?.message) {
      text = message.message
    } else if (message?.detail) {
      text = Array.isArray(message.detail)
        ? message.detail.map((m) => m?.message || m?.msg || (typeof m === 'string' ? m : JSON.stringify(m))).join(', ')
        : String(message.detail)
    } else {
      try {
        text = JSON.stringify(message)
      } catch {
        text = String(message)
      }
    }

    setToasts((prev) => [...prev, { id, message: text, type }])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    return id
  }, [removeToast])

  const toast = {
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    info: (msg, dur) => showToast(msg, 'info', dur)
  }

  const showConfirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    onConfirm = () => {},
    onCancel = () => {}
  }) => {
    setConfirmModal({
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm: async () => {
        try {
          await onConfirm()
        } finally {
          setConfirmModal(null)
        }
      },
      onCancel: () => {
        try {
          onCancel()
        } finally {
          setConfirmModal(null)
        }
      }
    })
  }, [])

  // Global safety override: If any component or library ever invokes window.alert,
  // it will automatically redirect to our sleek toast instead of popping up a white browser box.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const originalAlert = window.alert
    window.alert = (msg) => {
      showToast(msg, 'warning')
    }
    return () => {
      window.alert = originalAlert
    }
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, toast, showConfirm }}>
      {children}

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => {
            const isSuccess = t.type === 'success'
            const isError = t.type === 'error'
            const isWarning = t.type === 'warning'

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-3 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border pointer-events-auto transition-all ${
                  isSuccess
                    ? 'bg-[#0a160d]/95 border-emerald-500/30 text-emerald-300 shadow-emerald-950/40'
                    : isError
                    ? 'bg-[#180a0a]/95 border-rose-500/30 text-rose-300 shadow-rose-950/40'
                    : isWarning
                    ? 'bg-[#181308]/95 border-amber-500/30 text-amber-300 shadow-amber-950/40'
                    : 'bg-[#0f1118]/95 border-indigo-500/30 text-indigo-300 shadow-indigo-950/40'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isSuccess
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : isError
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      : isWarning
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {isWarning && <AlertTriangle className="w-4 h-4" />}
                  {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-xs font-medium text-white/90 leading-relaxed break-words">
                    {t.message}
                  </p>
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  aria-label="Close notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={confirmModal.onCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#121218] border border-white/10 shadow-2xl shadow-purple-950/50 rounded-2xl p-6 text-white overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                  confirmModal.type === 'danger'
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}>
                  {confirmModal.type === 'danger' ? (
                    <AlertCircle size={22} />
                  ) : (
                    <HelpCircle size={22} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white mb-1.5">
                    {confirmModal.title}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>

                <button
                  onClick={confirmModal.onCancel}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={confirmModal.onCancel}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-all"
                >
                  {confirmModal.cancelText}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`px-5 py-2 rounded-xl text-white font-medium text-sm shadow-lg transition-all active:scale-95 ${
                    confirmModal.type === 'danger'
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/25'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/25'
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
