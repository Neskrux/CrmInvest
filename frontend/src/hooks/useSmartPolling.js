import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook profissional para polling inteligente
 * - Só executa quando a página está visível
 * - Evita múltiplas chamadas simultâneas
 * - Cleanup automático
 * - Configurável por componente
 */
const useSmartPolling = (callback, interval = 120000, dependencies = []) => {
  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);
  const lastCallRef = useRef(0);

  // Função para verificar se deve executar o polling
  const shouldPoll = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;
    
    // Evitar chamadas muito próximas (debounce de 5 segundos)
    if (timeSinceLastCall < 5000) {
      return false;
    }
    
    // Só executar se página estiver visível
    return document.visibilityState === 'visible' && isActiveRef.current;
  }, []);

  // Função de polling com debounce
  const executePolling = useCallback(async () => {
    if (!shouldPoll()) return;
    
    try {
      lastCallRef.current = Date.now();
      await callback();
    } catch (error) {
      console.warn('Erro no polling inteligente:', error);
    }
  }, [callback, shouldPoll]);

  // Configurar polling
  useEffect(() => {
    if (!callback || typeof callback !== 'function') return;

    // Limpar intervalo anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Configurar novo intervalo
    intervalRef.current = setInterval(executePolling, interval);

    // Executar imediatamente se página estiver visível
    if (shouldPoll()) {
      executePolling();
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [executePolling, interval, ...dependencies]);

  // Pausar polling quando página não estiver visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isActiveRef.current = true;
        // Executar imediatamente quando voltar a ficar visível
        if (shouldPoll()) {
          executePolling();
        }
      } else {
        isActiveRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [executePolling, shouldPoll]);

  // Cleanup quando componente desmontar
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isActive: isActiveRef.current,
    lastCall: lastCallRef.current
  };
};

export default useSmartPolling;
