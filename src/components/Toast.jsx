import { useEffect } from 'react';

/**
 * toast: { id, type: 'error'|'success'|'info', message }
 */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.type === 'error' ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const bg =
    toast.type === 'error' ? '#fef2f2' :
    toast.type === 'success' ? '#f0fdf4' : '#eff6ff';
  const border =
    toast.type === 'error' ? '#fca5a5' :
    toast.type === 'success' ? '#86efac' : '#93c5fd';
  const color =
    toast.type === 'error' ? '#dc2626' :
    toast.type === 'success' ? '#059669' : '#2563eb';
  const icon =
    toast.type === 'error' ? '⚠️' :
    toast.type === 'success' ? '✅' : 'ℹ️';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 10000,
        maxWidth: 380,
        padding: '12px 16px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        color,
        fontFamily: "'Syne',sans-serif",
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        animation: 'slideIn 0.25s ease',
      }}
      role="alert"
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color,
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}
