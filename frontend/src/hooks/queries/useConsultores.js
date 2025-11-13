/**
 * Hook de query para Consultores
 */
import { useQuery } from '@tanstack/react-query';
import { fetchConsultores, fetchSdrsIncorporadora } from '../../services/consultores';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Hook para buscar consultores
 */
export function useConsultores(options = {}) {
  return useQuery({
    queryKey: queryKeys.consultores.lists(),
    queryFn: fetchConsultores,
    staleTime: 1000 * 60 * 5, // 5 minutos (dados mudam pouco)
    ...options
  });
}

/**
 * Hook para buscar SDRs da incorporadora
 */
export function useSdrsIncorporadora(options = {}) {
  const { isIncorporadora } = useAuth();

  return useQuery({
    queryKey: queryKeys.consultores.sdrs(),
    queryFn: fetchSdrsIncorporadora,
    enabled: !!isIncorporadora, // Só busca se for incorporadora
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options
  });
}

