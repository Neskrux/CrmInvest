/**
 * Hook de query para buscar solicitações de antecipação
 */
import { useQuery } from '@tanstack/react-query';
import { fetchSolicitacoesAntecipacao } from '../../services/carteira';
import { queryKeys } from '../../lib/query-keys';

/**
 * Hook para buscar solicitações de antecipação
 * @param {Object} options - Opções do useQuery
 */
export function useSolicitacoesAntecipacao(options = {}) {
  return useQuery({
    queryKey: queryKeys.carteira.antecipacoes(),
    queryFn: fetchSolicitacoesAntecipacao,
    staleTime: 1000 * 60 * 2, // 2 minutos
    ...options
  });
}

