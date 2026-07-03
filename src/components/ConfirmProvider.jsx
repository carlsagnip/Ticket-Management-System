import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal } from './ConfirmModal';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: false,
    isAlert: false,
    resolve: null
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirm',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDestructive: options.isDestructive || false,
        isAlert: false,
        resolve
      });
    });
  }, []);

  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Alert',
        message: options.message || '',
        confirmText: options.confirmText || 'OK',
        cancelText: '',
        isDestructive: false,
        isAlert: true,
        resolve
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
    if (confirmState.resolve) confirmState.resolve(false);
  }, [confirmState]);

  const handleConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
    if (confirmState.resolve) confirmState.resolve(true);
  }, [confirmState]);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        isDestructive={confirmState.isDestructive}
        isAlert={confirmState.isAlert}
      />
    </ConfirmContext.Provider>
  );
};
