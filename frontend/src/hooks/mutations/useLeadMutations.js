/**
 * Hooks de mutations para Leads
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  approveLead, 
  takeLead, 
  deleteLead, 
  updateLeadStatus,
  createLead
} from '../../services/leads';
import { queryKeys } from '../../lib/query-keys';
import { useToast } from '../../contexts';

/**
 * Hook para aprovar lead
 */
export function useApproveLead() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  return useMutation({
    mutationFn: approveLead,
    onSuccess: () => {
      showSuccessToast('Lead aprovado com sucesso!');
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.novos() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao aprovar lead');
    }
  });
}

/**
 * Hook para pegar/atribuir lead
 */
export function useTakeLead() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  return useMutation({
    mutationFn: ({ leadId, consultorId = null }) => {
      return takeLead(leadId, consultorId);
    },
    onSuccess: () => {
      showSuccessToast('Lead atribuído com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.novos() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao atribuir lead');
    }
  });
}

/**
 * Hook para deletar lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      showSuccessToast('Lead excluído com sucesso!');
      // Invalidar ambas as listas
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.novos() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.negativos() });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao excluir lead');
    }
  });
}

/**
 * Hook para atualizar status do lead
 */
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  return useMutation({
    mutationFn: ({ leadId, status }) => {
      return updateLeadStatus(leadId, status);
    },
    onSuccess: () => {
      showSuccessToast('Status atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.novos() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.negativos() });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao alterar status');
    }
  });
}

/**
 * Hook para criar novo lead/cliente (incorporadora)
 */
export function useCreateLead() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      showSuccessToast('Cliente criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.novos() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao criar cliente');
    }
  });
}

