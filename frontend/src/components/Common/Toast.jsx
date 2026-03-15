import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const COLORS = {
  success: { bg: '#14532d', border: '#22c55e33', color: '#22c55e' },
  error:   { bg: '#3b0a0a', border: '#ef444433', color: '#ef4444' },
  info:    { bg: '#1a237e', border: '#6c63ff33', color: '#a5a0ff' },
};

function ToastItem({ toast, onClose }) {
  const c = COLORS[toast.type] || COLORS.info;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      fontSize: 13, fontWeight: 500, minWidth: 260, maxWidth: 380,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      animation: 'toast-in 0.2s ease',
    }}>
      <span>{toast.message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: c.color, cursor: 'pointer', fontSize: 16, padding: 0, opacity: 0.7, flexShrink: 0 }}
      >×</button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {typeof document !== 'undefined' && (
        <>
          <style>{`@keyframes toast-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
          <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
            {toasts.map((t) => (
              <div key={t.id} style={{ pointerEvents: 'auto' }}>
                <ToastItem toast={t} onClose={() => dismiss(t.id)} />
              </div>
            ))}
          </div>
        </>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
