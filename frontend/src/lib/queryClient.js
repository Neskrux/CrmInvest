/**
 * Configuração do React Query (TanStack Query)
 * QueryClient configurado com opções padrão para a aplicação
 */

import { QueryClient } from '@tanstack/react-query';

// Função para obter a função de logout do AuthContext quando disponível
// Isso será usado nos error handlers do React Query
let logoutFunction = null;

export const setLogoutFunction = (fn) => {
  logoutFunction = fn;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tempo que os dados são considerados "frescos" (não faz refetch automático)
      staleTime: 5 * 60 * 1000, // 5 minutos
      
      // Tempo que os dados ficam em cache após serem marcados como "stale"
      cacheTime: 10 * 60 * 1000, // 10 minutos
      
      // Refetch quando a janela ganha foco
      refetchOnWindowFocus: true,
      
      // Refetch quando reconecta à internet
      refetchOnReconnect: true,
      
      // NÃO fazer refetch automático quando os dados ficam stale (faz apenas em background)
      refetchOnMount: true,
      
      // Retry em caso de erro
      retry: (failureCount, error) => {
        // Não retry em caso de 401 (sessão expirada)
        if (error?.message === 'Sessão expirada') {
          if (logoutFunction) {
            logoutFunction();
          }
          return false;
        }
        
        // Não retry em caso de 429 (rate limiting)
        if (error?.message === '429 Too Many Requests') {
          return false;
        }
        
        // Retry até 2 vezes para outros erros
        return failureCount < 2;
      },
      
      // Delay exponencial entre retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry em mutations apenas para erros de rede
      retry: (failureCount, error) => {
        // Não retry em caso de 401
        if (error?.message === 'Sessão expirada') {
          if (logoutFunction) {
            logoutFunction();
          }
          return false;
        }
        
        // Retry apenas para erros de rede (não para 4xx, 5xx)
        return failureCount < 1 && error?.message?.includes('conexão');
      },
    },
  },
});

export default queryClient;

