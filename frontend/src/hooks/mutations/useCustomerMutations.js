/**
 * Hooks de mutations para Customers/Pacientes
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createCustomer, 
  updateCustomer, 
  deleteCustomer, 
  updateCustomerStatus,
  createCustomerLogin,
  uploadCustomerDocument
} from '../../services/customers';
import { queryKeys } from '../../lib/query-keys';
import { useToast } from '../../contexts';
import { useAuth } from '../../contexts/AuthContext';
import useBranding from '../useBranding';

/**
 * Hook para criar customer/paciente
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();
  const { empresaId } = useBranding();

  return useMutation({
    mutationFn: async (data) => {
      // Converter data_nascimento de DD/MM/AAAA para YYYY-MM-DD se preenchida
      const dataToSend = { ...data };
      if (dataToSend.data_nascimento && dataToSend.data_nascimento.length === 10) {
        const partes = dataToSend.data_nascimento.split('/');
        if (partes.length === 3) {
          dataToSend.data_nascimento = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
      } else if (dataToSend.data_nascimento === '') {
        delete dataToSend.data_nascimento;
      }

      // Ao criar novo paciente, usar status "sem_primeiro_contato" para cadastros manuais
      const newPatientData = {
        ...dataToSend,
        status: 'sem_primeiro_contato'
      };

      return createCustomer(newPatientData);
    },
    onSuccess: () => {
      showSuccessToast(`${empresaId === 5 ? 'Cliente' : 'Paciente'} cadastrado com sucesso!`);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      // Forçar atualização nas outras telas
      const timestamp = Date.now();
      localStorage.setItem('data_sync_trigger', timestamp.toString());
      window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
    },
    onError: (error) => {
      showErrorToast(`Erro ao salvar ${empresaId === 5 ? 'cliente' : 'paciente'}: ${error.message}`);
    }
  });
}

/**
 * Hook para atualizar customer/paciente
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();
  const { empresaId } = useBranding();

  return useMutation({
    mutationFn: ({ id, data }) => {
      // Converter data_nascimento de DD/MM/AAAA para YYYY-MM-DD se preenchida
      const dataToSend = { ...data };
      if (dataToSend.data_nascimento && dataToSend.data_nascimento.length === 10) {
        const partes = dataToSend.data_nascimento.split('/');
        if (partes.length === 3) {
          dataToSend.data_nascimento = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
      } else if (dataToSend.data_nascimento === '') {
        delete dataToSend.data_nascimento;
      }

      return updateCustomer(id, dataToSend);
    },
    onSuccess: () => {
      showSuccessToast(`${empresaId === 5 ? 'Cliente' : 'Paciente'} atualizado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      const timestamp = Date.now();
      localStorage.setItem('data_sync_trigger', timestamp.toString());
      window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
    },
    onError: (error) => {
      showErrorToast(`Erro ao salvar ${empresaId === 5 ? 'cliente' : 'paciente'}: ${error.message}`);
    }
  });
}

/**
 * Hook para deletar customer/paciente
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();
  const { empresaId } = useBranding();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      showSuccessToast(`${empresaId === 5 ? 'Cliente' : 'Paciente'} excluído com sucesso!`);
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.agendamentos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.fechamentos.all });
      const timestamp = Date.now();
      localStorage.setItem('data_sync_trigger', timestamp.toString());
      window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
    },
    onError: (error) => {
      showErrorToast(`Erro ao excluir ${empresaId === 5 ? 'cliente' : 'paciente'}: ${error.message}`);
    }
  });
}

/**
 * Hook para atualizar status do customer
 */
export function useUpdateCustomerStatus() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();
  const { user } = useAuth();
  const { empresaId } = useBranding();

  return useMutation({
    mutationFn: ({ pacienteId, newStatus, evidenciaId = null }) => {
      return updateCustomerStatus(pacienteId, newStatus, evidenciaId);
    },
    onSuccess: (data, variables) => {
      showSuccessToast('Status atualizado com sucesso!');
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      
      // Para incorporadora, verificar se precisa mover para leads negativos
      if (user?.empresa_id === 5) {
        const statusNegativos = [
          'nao_existe',
          'nao_tem_interesse', 
          'nao_reconhece',
          'nao_responde',
          'nao_passou_cpf',
          'nao_tem_outro_cpf',
          'cpf_reprovado'
        ];
        
        if (statusNegativos.includes(variables.newStatus)) {
          // Retornar informação para o componente decidir se muda de aba
          return { shouldChangeTab: 'leads-negativos' };
        }
      }
      
      const timestamp = Date.now();
      localStorage.setItem('data_sync_trigger', timestamp.toString());
      window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
    },
    onError: (error) => {
      showErrorToast(`Erro ao atualizar status: ${error.message}`);
    }
  });
}

/**
 * Hook para criar login do paciente
 */
export function useCreateCustomerLogin() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  return useMutation({
    mutationFn: ({ pacienteId, credentials = {} }) => {
      return createCustomerLogin(pacienteId, credentials);
    },
    onSuccess: (data) => {
      showSuccessToast(data.recriado ? 'Login recriado com sucesso!' : 'Login gerado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      return data; // Retornar credenciais para mostrar no modal
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao gerar login');
    }
  });
}

/**
 * Hook para upload de documento do paciente
 */
export function useUploadCustomerDocument() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  return useMutation({
    mutationFn: ({ pacienteId, docType, file }) => {
      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande! Máximo 10MB');
      }
      return uploadCustomerDocument(pacienteId, docType, file);
    },
    onSuccess: () => {
      showSuccessToast('Documento enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
    onError: (error) => {
      showErrorToast(error.message || 'Erro ao enviar documento');
    }
  });
}

