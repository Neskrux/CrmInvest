import { useEffect } from 'react';

export function useModalBodyLock(modals) {
  useEffect(() => {
    const modalsAbertos = Object.values(modals).some(Boolean);
    
    if (modalsAbertos) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modals]);
}

