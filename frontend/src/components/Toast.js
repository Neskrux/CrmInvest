import React, { useState, useEffect } from 'react';

const Toast = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (toast?.id) {
        onClose(toast.id);
      }
    }, 300);
  };

  useEffect(() => {
    if (toast && toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          if (toast?.id) {
            onClose(toast.id);
          }
        }, 300);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id, toast?.duration]);

  // Verificação de segurança: se toast não existe, não renderiza nada
  // Deve vir DEPOIS de todos os hooks
  if (!toast) {
    return null;
  }

  const getToastStyles = () => {
    const baseStyles = {
      position: 'relative',
      minWidth: '320px',
      maxWidth: '480px',
      padding: '12px 14px',
      marginBottom: '8px',
      borderRadius: '10px',
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      lineHeight: '1.4',
      fontWeight: '600',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      transform: isExiting ? 'translateX(100%) scale(0.95)' : 'translateX(0) scale(1)',
      opacity: isExiting ? 0 : 1,
      zIndex: 1000000
    };

    const typeStyles = {
      success: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        borderLeft: '4px solid #34d399',
        boxShadow: '0 6px 16px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08)'
      },
      error: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        borderLeft: '4px solid #f87171',
        boxShadow: '0 6px 16px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08)'
      },
      warning: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        borderLeft: '4px solid #fbbf24',
        boxShadow: '0 6px 16px rgba(245, 158, 11, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08)'
      },
      info: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        borderLeft: '4px solid #60a5fa',
        boxShadow: '0 6px 16px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08)'
      }
    };

    const toastType = toast?.type || 'info';
    return {
      ...baseStyles,
      ...(typeStyles[toastType] || typeStyles.info)
    };
  };

  const getIcon = () => {
    const iconStyles = {
      width: '20px',
      height: '20px',
      flexShrink: 0,
      opacity: 1
    };

    const toastType = toast?.type || 'info';
    switch (toastType) {
      case 'success':
        return (
          <svg style={iconStyles} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
        );
      case 'error':
        return (
          <svg style={iconStyles} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        );
      case 'warning':
        return (
          <svg style={iconStyles} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        );
      default:
        return (
          <svg style={iconStyles} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        );
    }
  };

  return (
    <div style={getToastStyles()}>
      {getIcon()}
      <div style={{
        flex: 1,
        fontWeight: '500',
        letterSpacing: '0.025em'
      }}>
        {toast?.message || ''}
      </div>
      <button
        onClick={handleClose}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: 'currentColor',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '6px',
          opacity: 0.9,
          transition: 'all 0.2s ease',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = 1;
          e.target.style.transform = 'scale(1.08)';
          e.target.style.background = 'rgba(255, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = 0.9;
          e.target.style.transform = 'scale(1)';
          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  // Filtrar toasts inválidos antes de renderizar
  const validToasts = toasts.filter(toast => toast && toast.id);

  if (validToasts.length === 0) return null;

  return (
    <>
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        {validToasts.map(toast => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              animation: 'toastSlideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            }}
          >
            <Toast toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>
      <style>
        {`
          @keyframes toastSlideIn {
            from {
              transform: translateX(100%) scale(0.8);
              opacity: 0;
            }
            to {
              transform: translateX(0) scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </>
  );
};

export default Toast;
