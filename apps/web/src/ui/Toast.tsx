import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  notify: (toast: ToastInput) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current.slice(-3), { ...toast, id }]);
    window.setTimeout(() => dismiss(id), toast.tone === "error" ? 6500 : 4200);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({
    notify,
    success: (title, message) => notify({ tone: "success", title, message }),
    error: (title, message) => notify({ tone: "error", title, message }),
    info: (title, message) => notify({ tone: "info", title, message })
  }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(360px,calc(100vw-2rem))] gap-3">
        {toasts.map((toast) => (
          <div
            className={`pointer-events-auto rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur ${
              toast.tone === "success" ? "border-emerald-200" : toast.tone === "error" ? "border-red-200" : "border-line"
            }`}
            key={toast.id}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${toast.tone === "success" ? "text-emerald-700" : toast.tone === "error" ? "text-rust" : "text-ink"}`}>{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm text-steel">{toast.message}</p> : null}
              </div>
              <button className="bg-transparent p-0 text-lg leading-none text-steel hover:bg-transparent hover:text-ink" onClick={() => dismiss(toast.id)} type="button" aria-label="Dismiss notification">
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}

export function useCrudToast(entityName: string) {
  const toast = useToast();
  const noun = entityName.trim();

  return {
    created: (label?: string) => toast.success(`${noun} created`, successMessage(label)),
    updated: (label?: string) => toast.success(`${noun} updated`, successMessage(label)),
    deleted: (label?: string) => toast.success(`${noun} deleted`, successMessage(label)),
    completed: (label?: string) => toast.success(`${noun} completed`, successMessage(label)),
    reopened: (label?: string) => toast.success(`${noun} reopened`, successMessage(label)),
    failed: (action: string, error: unknown) => toast.error(`${noun} ${action} failed`, errorMessage(error))
  };
}

function successMessage(label?: string) {
  return label ? label : undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Try again or review the form fields.";
}
