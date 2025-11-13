/**
 * Hooks de mutations para Carteira
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createSolicitacaoCarteira,
  deleteSolicitacaoCarteira,
  updateSolicitacaoCarteiraStatus,
  createSolicitacaoAntecipacao,
  uploadContratoCarteira,
  approveContratoCarteira,
  reproveContratoCarteira,
  deleteContratoCarteira
} from '../../services/carteira';
import { queryKeys } from '../../lib/query-keys';
import { useToast } from '../../contexts';

/**
 * Hook para criar solicitação de carteira
 */
export function useCreateSolicitacaoCarteira() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast, showInfoToast } = useToast();

  return useMutation({
    mutationFn: createSolicitacaoCarteira,
    onSuccess: () => {
      showSuccessToast('Solicitação enviada para aprovação!');
      showInfoToast('Aguarde a aprovação do administrador');
      queryClient.invalidateQueries({ queryKey: queryKeys.carteira.solicitacoes() });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao enviar solicitação');
    }
  });
}

/**
 * Hook para deletar solicitação de carteira
 */
export function useDeleteSolicitacaoCarteira() {
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  return useMutation({
    mutationFn: deleteSolicitacaoCarteira,
    onSuccess: () => {
      showSuccessToast('Solicitação excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.carteira.solicitacoes() });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao excluir solicitação');
    }
  });
}

/**
 * Hook para atualizar status da solicitação de carteira
 */
export function useUpdateSolicitacaoCarteiraStatus() {
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  return useMutation({
    mutationFn: ({ id, status, observacoesAdmin = '' }) => {
      return updateSolicitacaoCarteiraStatus(id, status, observacoesAdmin);
    },
    onSuccess: (data, variables) => {
      showSuccessToast(
        variables.status === 'aprovado' 
          ? 'Solicitação aprovada com sucesso!' 
          : 'Solicitação reprovada.'
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.carteira.solicitacoes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fechamentos.all });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao atualizar solicitação');
    }
  });
}

/**
 * Hook para criar solicitação de antecipação
 */
export function useCreateSolicitacaoAntecipacao() {
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  return useMutation({
    mutationFn: createSolicitacaoAntecipacao,
    onSuccess: () => {
      showSuccessToast('Solicitação de antecipação enviada para aprovação.');
      queryClient.invalidateQueries({ queryKey: queryKeys.carteira.antecipacoes() });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao solicitar antecipação');
    }
  });
}

/**
 * Hook para upload de contrato
 */
export function useUploadContratoCarteira() {
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  return useMutation({
    mutationFn: (formData) => {
      return uploadContratoCarteira(formData);
    },
    onSuccess: (data, variables) => {
      showSuccessToast('Contrato enviado com sucesso!');
      // Invalidar contratos da solicitação específica
      const solicitacaoId = variables.get('solicitacao_carteira_id');
      if (solicitacaoId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.carteira.contratos(solicitacaoId) 
        });
      }
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao enviar contrato');
    }
  });
}

/**
 * Hook para aprovar contrato
 */
export function useApproveContratoCarteira() {
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  return useMutation({
    mutationFn: approveContratoCarteira,
    onSuccess: (data, contratoId) => {
      showSuccessToast('Contrato aprovado!');
      // Invalidar todos os contratos (não temos solicitacaoId aqui facilmente)
      queryClient.invalidateQueries({ queryKey: queryKeys.carteira.all });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao aprovar contrato');
    }
  });
}

/**
 * Hook para reprovar contrato
 */
export function useReproveContratoCarteira() {
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  return useMutation({
    mutationFn: ({ contratoId, motivo }) => {
      return reproveContratoCarteira(contratoId, motivo);
    },
    onSuccess: () => {
      showSuccessToast('Contrato reprovado');
      queryClient.invalidateQueries({ queryKey: queryKeys.carteira.all });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao reprovar contrato');
    }
  });
}

/**
 * Hook para deletar contrato
 */
export function useDeleteContratoCarteira() {
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  return useMutation({
    mutationFn: deleteContratoCarteira,
    onSuccess: () => {
      showSuccessToast('Contrato deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.carteira.all });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao deletar contrato');
    }
  });
}

