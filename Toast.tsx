// FILE: Toast.tsx - Complete toast notification system
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================
type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================
const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================================
// HOOK
// ============================================================================
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.addToast;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    const newToast: ToastMessage = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// TOAST CONTAINER COMPONENT
// ============================================================================
function ToastContainer({ 
  toasts, 
  onRemove 
}: { 
  toasts: ToastMessage[]; 
  onRemove: (id: string) => void; 
}) {
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 400px;
        }
        
        .toast {
          padding: 12px 16px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          cursor: pointer;
          user-select: none;
          word-break: break-word;
          animation: slideInFromRight 0.3s ease-out;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .toast.success {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .toast.error {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .toast.info {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      
      <div className="toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast ${toast.type}`}
            onClick={() => onRemove(toast.id)}
            title="Click to dismiss"
          >
            <span>{getToastIcon(toast.type)}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function getToastIcon(type: ToastType): string {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'info': return 'ℹ️';
    default: return '';
  }
}

// ============================================================================
// DEFAULT EXPORT (Toast component for App.tsx)
// ============================================================================
export default function Toast() {
  // This component is just a placeholder since the real toasts
  // are rendered by ToastProvider. App.tsx includes this for legacy compatibility.
  return null;
}