import React, { useState, useEffect, createContext } from 'react';
import ToastContainer from '../components/Toast';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };

    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, duration) => addToast(message, 'success', duration);
  const error = (message, duration) => addToast(message, 'error', duration);
  const warning = (message, duration) => addToast(message, 'warning', duration);
  const info = (message, duration) => addToast(message, 'info', duration);

  useEffect(() => {
    window.originalAlert = window.alert;
    window.alert = (message, type = 'info', duration = 4000) => {
      return addToast(message, type, duration);
    };

    return () => {
      window.alert = window.originalAlert;
    };
  }, []);

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    showSuccessToast: success,
    showErrorToast: error,
    showWarningToast: warning,
    showInfoToast: info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

