import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, ring: 'border-accent/40', iconCls: 'text-accent' },
  error: { icon: TriangleAlert, ring: 'border-danger/40', iconCls: 'text-danger' },
  info: { icon: Info, ring: 'border-line', iconCls: 'text-primary' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message, duration = 3800) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m, 5000),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border ${s.ring} bg-white px-4 py-3 shadow-pop`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.iconCls}`} />
              <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
