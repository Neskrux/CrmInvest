/**
 * Hook de query para Agendamentos
 */
import { useQuery } from '@tanstack/react-query';
import { fetchAgendamentosGerais, fetchAgendamentosDashboard } from '../../services/agendamentos';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Função helper para filtrar agendamentos baseado no tipo de usuário
 */
function filterAgendamentosByUser(data, user, isAdmin) {
  if (!Array.isArray(data)) return [];
  if (isAdmin) return data;

  const currentUserId = Number(user?.id || 0);
  const currentConsultorId = Number(user?.consultor_id || 0);

  return data.filter(a => {
    const sdrMatch = Number(a.sdr_id || 0) === currentUserId;
    const consultorMatch = Number(a.consultor_id || 0) === currentConsultorId;
    const consultorInternoMatch = Number(a.consultor_interno_id || 0) === currentConsultorId;
    return sdrMatch || consultorMatch || consultorInternoMatch;
  });
}

/**
 * Hook para buscar agendamentos
 */
export function useAgendamentos(options = {}) {
  const { user, isAdmin, isFreelancer } = useAuth();

  return useQuery({
    queryKey: queryKeys.agendamentos.lists(),
    queryFn: async () => {
      // Usar endpoint geral se for freelancer, endpoint filtrado caso contrário
      const endpoint = isFreelancer 
        ? fetchAgendamentosDashboard 
        : fetchAgendamentosGerais;
      
      const data = await endpoint();
      return filterAgendamentosByUser(data, user, isAdmin);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 2, // Polling a cada 2 minutos
    ...options
  });
}

