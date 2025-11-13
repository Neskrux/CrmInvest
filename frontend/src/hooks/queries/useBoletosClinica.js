/**
 * Hook de query para buscar boletos da clínica
 * Agrupa boletos por paciente usando useQueries para múltiplos fechamentos
 */
import { useQueries } from '@tanstack/react-query';
import { fetchBoletosFechamento } from '../../services/fechamentos';
import { queryKeys } from '../../lib/query-keys';
import { useMemo } from 'react';

/**
 * Hook para buscar boletos de múltiplos fechamentos e agrupar por paciente
 * @param {Array} fechamentos - Lista de fechamentos da clínica
 * @param {boolean} isClinica - Se o usuário é clínica
 * @param {number} clinicaId - ID da clínica
 */
export function useBoletosClinica(fechamentos = [], isClinica = false, clinicaId = null) {
  // Filtrar fechamentos da clínica
  const fechamentosClinica = useMemo(() => {
    if (!isClinica || !clinicaId || !Array.isArray(fechamentos)) return [];
    const clinicaIdNumber = Number(clinicaId);
    return fechamentos.filter(f => Number(f.clinica_id || 0) === clinicaIdNumber);
  }, [fechamentos, isClinica, clinicaId]);

  // Criar queries para cada fechamento
  const boletosQueries = useQueries({
    queries: fechamentosClinica.map(fechamento => ({
      queryKey: queryKeys.fechamentos.boletos(fechamento.id),
      queryFn: () => fetchBoletosFechamento(fechamento.id),
      enabled: !!fechamento.id && isClinica && !!clinicaId,
      staleTime: 1000 * 60 * 5, // 5 minutos
    }))
  });

  // Agrupar boletos por paciente
  const boletosPorPaciente = useMemo(() => {
    const mapaBoletos = {};
    
    boletosQueries.forEach((query, index) => {
      const fechamento = fechamentosClinica[index];
      if (!fechamento || !query.isSuccess || !query.data) return;

      const pacienteId = Number(fechamento.paciente_id);
      if (!Number.isFinite(pacienteId)) return;

      const boletos = Array.isArray(query.data?.boletos) ? query.data.boletos : [];
      boletos.forEach(boleto => {
        if ((boleto.status || '').toLowerCase() === 'cancelado') return;
        mapaBoletos[pacienteId] = (mapaBoletos[pacienteId] || 0) + 1;
      });
    });

    return mapaBoletos;
  }, [boletosQueries, fechamentosClinica]);

  // Verificar se está carregando
  const isLoading = boletosQueries.some(query => query.isLoading);

  return {
    data: boletosPorPaciente,
    isLoading,
    isError: boletosQueries.some(query => query.isError),
    error: boletosQueries.find(query => query.error)?.error,
  };
}

