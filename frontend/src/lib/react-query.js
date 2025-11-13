import { QueryClient } from '@tanstack/react-query';

// Configuração do QueryClient com padrões otimizados
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tempo que os dados são considerados "frescos" (não precisam refetch)
      staleTime: 1000 * 60 * 2, // 2 minutos
      // Tempo que os dados ficam em cache mesmo após componente desmontar
      cacheTime: 1000 * 60 * 10, // 10 minutos
      // Refetch automático quando janela ganha foco
      refetchOnWindowFocus: true,
      // Refetch automático quando reconecta à internet
      refetchOnReconnect: true,
      // Não refetch automaticamente ao montar (já temos staleTime)
      refetchOnMount: false,
      // Retry em caso de erro
      retry: 1,
      // Delay entre retries
      retryDelay: 1000,
    },
    mutations: {
      // Retry em mutations apenas para erros de rede
      retry: (failureCount, error) => {
        // Não retry para erros 4xx (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

