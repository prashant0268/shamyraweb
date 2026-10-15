import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => { setMsg(m); window.clearTimeout(t.current); t.current = window.setTimeout(() => setMsg(null), 2200); }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className={`pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg shadow-lg transition-opacity ${msg ? 'opacity-100' : 'opacity-0'}`}>{msg}</div>
    </ToastContext.Provider>
  );
};
