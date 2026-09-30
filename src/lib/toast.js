"use client";

/**
 * Lightweight toast system. No dependencies. Three flavors: info, success, error.
 *
 * Usage from a component:
 *   import { useToast } from "@/lib/toast";
 *   const { showToast } = useToast();
 *   showToast({ kind: "success", title: "Loan repaid", message: "..." });
 *
 * Usage from outside React (services, async flows):
 *   import { toast } from "@/lib/toast";
 *   toast.success("Loan repaid", "...");
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

let standaloneEmit = null;

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((t) => {
    const id = genId();
    const toast = {
      id,
      kind: "info",
      duration: 5000,
      ...t,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, toast.duration);
    }
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    standaloneEmit = showToast;
    return () => {
      standaloneEmit = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <ToastRack toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

// Standalone emitter for non-React callers
export const toast = {
  info: (title, message) => standaloneEmit?.({ kind: "info", title, message }),
  success: (title, message) => standaloneEmit?.({ kind: "success", title, message }),
  error: (title, message) => standaloneEmit?.({ kind: "error", title, message, duration: 7000 }),
};

function ToastRack({ toasts, dismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-rack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
            {t.action && (
              <button className="toast-action" onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
          </div>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}