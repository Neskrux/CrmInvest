/**
 * Hook de query para Clínicas
 */
import { useQuery } from '@tanstack/react-query';
import { fetchClinicas } from '../../services/clinicas';
import { queryKeys } from '../../lib/query-keys';

/**
 * Hook para buscar clínicas
 */
export function useClinicas(options = {}) {
  return useQuery({
    queryKey: queryKeys.clinicas.lists(),
    queryFn: fetchClinicas,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options
  });
}

