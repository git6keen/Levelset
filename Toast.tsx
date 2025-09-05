// FILE: Toast.tsx - Modern toast notifications
import React, { useEffect } from 'react';
import { useToast } from './ui-store.js';

export default function Toast() {
  const { toast, hideToast } = useToast();

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  if (!toast) return null;

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '600',
      fontSize: '14px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      zIndex: 9999,
      animation: 'slideInFromRight 0.3s ease-out',
      cursor: 'pointer',
      userSelect: 'none' as const,
      maxWidth: '400px',
      wordBreak: 'break-word' as const,
    };

    const typeStyles = {
      success: {
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
      error: {
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
      info: {
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
    };

    return { ...baseStyles, ...typeStyles[toast.type] };
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '';
    }
  };

  return (
    <>
      <style>{`
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
      
      <div 
        style={getToastStyles()}
        onClick={hideToast}
        title="Click to dismiss"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{getIcon()}</span>
          <span>{toast.message}</span>
        </div>
      </div>
    </>
  );
}