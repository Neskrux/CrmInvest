/**
 * Hook de query para Carteira
 */
import { useQuery } from '@tanstack/react-query';
import { 
  fetchSolicitacoesCarteira, 
  fetchContratosCarteira 
} from '../../services/carteira';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Hook para buscar solicitações de carteira
 */
export function useSolicitacoesCarteira(options = {}) {
  const { isAdmin, isClinica } = useAuth();

  return useQuery({
    queryKey: queryKeys.carteira.solicitacoes(),
    queryFn: fetchSolicitacoesCarteira,
    enabled: (isAdmin || isClinica) && !!isAdmin !== undefined, // Só busca se for admin ou clínica
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 2, // Polling a cada 2 minutos
    ...options
  });
}

/**
 * Hook para buscar contratos de uma solicitação de carteira
 */
export function useContratosCarteira(solicitacaoId, options = {}) {
  return useQuery({
    queryKey: queryKeys.carteira.contratos(solicitacaoId),
    queryFn: () => fetchContratosCarteira(solicitacaoId),
    enabled: !!solicitacaoId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options
  });
}

