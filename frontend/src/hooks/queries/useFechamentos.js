/**
 * Hook de query para Fechamentos
 */
import { useQuery } from '@tanstack/react-query';
import { fetchFechamentos, fetchBoletosFechamento } from '../../services/fechamentos';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Função helper para filtrar fechamentos baseado no tipo de usuário
 */
function filterFechamentosByUser(data, user, isAdmin, isClinica) {
  if (!Array.isArray(data)) return [];
  if (isAdmin) return data;

  const clinicaAtualId = Number(user?.clinica_id || 0);
  const currentUserId = Number(user?.id || 0);
  const currentConsultorId = Number(user?.consultor_id || 0);

  if (isClinica) {
    return data.filter(f => Number(f.clinica_id || 0) === clinicaAtualId);
  }

  return data.filter(f => {
    const sdrMatch = Number(f.sdr_id || 0) === currentUserId;
    const consultorMatch = Number(f.consultor_id || 0) === currentConsultorId;
    const consultorInternoMatch = Number(f.consultor_interno_id || 0) === currentConsultorId;
    return sdrMatch || consultorMatch || consultorInternoMatch;
  });
}

/**
 * Hook para buscar fechamentos
 */
export function useFechamentos(options = {}) {
  const { user, isAdmin, isClinica } = useAuth();

  return useQuery({
    queryKey: queryKeys.fechamentos.lists(),
    queryFn: async () => {
      const data = await fetchFechamentos();
      return filterFechamentosByUser(data, user, isAdmin, isClinica);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 2, // Polling a cada 2 minutos
    ...options
  });
}

/**
 * Hook para buscar boletos de um fechamento
 */
export function useBoletosFechamento(fechamentoId, options = {}) {
  return useQuery({
    queryKey: queryKeys.fechamentos.boletos(fechamentoId),
    queryFn: () => fetchBoletosFechamento(fechamentoId),
    enabled: !!fechamentoId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options
  });
}

