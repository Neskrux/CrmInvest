/**
 * Hook de query para Customers/Pacientes
 */
import { useQuery } from '@tanstack/react-query';
import { fetchCustomers } from '../../services/customers';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Função helper para filtrar pacientes baseado no tipo de usuário
 */
function filterCustomersByUser(data, user, isAdmin) {
  if (!Array.isArray(data)) return [];
  if (isAdmin) return data;

  const currentUserId = Number(user?.id || 0);
  const currentConsultorId = Number(user?.consultor_id || 0);

  return data.filter(p => {
    const sdrMatch = Number(p.sdr_id || 0) === currentUserId;
    const consultorMatch = Number(p.consultor_id || 0) === currentConsultorId;
    const consultorInternoMatch = Number(p.consultor_interno_id || 0) === currentConsultorId;
    return sdrMatch || consultorMatch || consultorInternoMatch;
  });
}

/**
 * Hook para buscar customers/pacientes
 */
export function useCustomers(options = {}) {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: queryKeys.customers.lists(),
    queryFn: async () => {
      const data = await fetchCustomers();
      return filterCustomersByUser(data, user, isAdmin);
    },
    enabled: !!user, // Só busca se tiver usuário logado
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 2, // Polling a cada 2 minutos
    ...options
  });
}

