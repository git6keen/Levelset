import React, { createContext, useContext, useState } from "react";

type Toast = { id: number; message: string };

const ToastContext = createContext<{ addToast: (msg: string) => void } | null>(null);

export function ToastProvider({ children }: React.PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(message: string) {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx.addToast;
}
