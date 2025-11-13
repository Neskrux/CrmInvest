/**
 * Hooks de mutations para Agendamentos
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAgendamento } from '../../services/agendamentos';
import { queryKeys } from '../../lib/query-keys';
import { useToast } from '../../contexts';

/**
 * Hook para criar agendamento
 */
export function useCreateAgendamento() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  return useMutation({
    mutationFn: createAgendamento,
    onSuccess: () => {
      showSuccessToast('Agendamento criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.agendamentos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      const timestamp = Date.now();
      localStorage.setItem('data_sync_trigger', timestamp.toString());
      window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao criar agendamento');
    }
  });
}

