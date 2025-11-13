/**
 * Hook de query para Leads
 */
import { useQuery } from '@tanstack/react-query';
import { fetchNovosLeads, fetchLeadsNegativos } from '../../services/leads';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Função helper para filtrar leads negativos baseado no tipo de usuário
 */
function filterLeadsNegativosByUser(data, user, isAdmin) {
  if (!Array.isArray(data)) return [];
  if (isAdmin) return data;

  const currentUserId = Number(user?.id || 0);
  const currentConsultorId = Number(user?.consultor_id || 0);

  return data.filter(l => {
    const sdrMatch = Number(l.sdr_id || 0) === currentUserId;
    const consultorMatch = Number(l.consultor_id || 0) === currentConsultorId;
    const consultorInternoMatch = Number(l.consultor_interno_id || 0) === currentConsultorId;
    return sdrMatch || consultorMatch || consultorInternoMatch;
  });
}

/**
 * Hook para buscar novos leads
 * Novos leads aparecem para todos sem filtro por consultor
 */
export function useNovosLeads(options = {}) {
  const { podeAlterarStatus, isConsultorInterno } = useAuth();

  return useQuery({
    queryKey: queryKeys.leads.novos(),
    queryFn: fetchNovosLeads,
    enabled: podeAlterarStatus || isConsultorInterno, // Só busca se pode alterar status
    staleTime: 1000 * 60 * 1, // 1 minuto (dados mudam frequentemente)
    refetchInterval: 1000 * 60 * 2, // Polling a cada 2 minutos
    ...options
  });
}

/**
 * Hook para buscar leads negativos
 */
export function useLeadsNegativos(options = {}) {
  const { user, isAdmin, podeAlterarStatus, isConsultorInterno } = useAuth();

  return useQuery({
    queryKey: queryKeys.leads.negativos(),
    queryFn: async () => {
      const data = await fetchLeadsNegativos();
      return filterLeadsNegativosByUser(data, user, isAdmin);
    },
    enabled: (podeAlterarStatus || isConsultorInterno) && !!user,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 2, // Polling a cada 2 minutos
    ...options
  });
}

