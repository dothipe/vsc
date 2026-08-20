import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = {
              success: CheckCircle2,
              error: XCircle,
              warning: AlertTriangle,
              info: Info,
            }[toast.type];

            const colors = {
              success: "bg-emerald-50 border-emerald-200 text-emerald-800",
              error: "bg-rose-50 border-rose-200 text-rose-800",
              warning: "bg-amber-50 border-amber-200 text-amber-800",
              info: "bg-blue-50 border-blue-200 text-blue-800",
            }[toast.type];

            const iconColors = {
              success: "text-emerald-500",
              error: "text-rose-500",
              warning: "text-amber-500",
              info: "text-blue-500",
            }[toast.type];

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${colors} font-sans`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{toast.title}</p>
                  <p className="text-xs mt-1 opacity-90 leading-normal">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 p-0.5 rounded-lg hover:bg-black/5 transition-colors"
                >
                  <X className="w-4 h-4 opacity-70" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
