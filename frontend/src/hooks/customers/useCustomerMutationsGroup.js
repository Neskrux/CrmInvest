import {
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useUpdateCustomerStatus,
  useCreateCustomerLogin
} from '../mutations/useCustomerMutations';
import {
  useApproveLead,
  useTakeLead,
  useDeleteLead,
  useUpdateLeadStatus,
  useCreateLead
} from '../mutations/useLeadMutations';
import { useCreateAgendamento } from '../mutations/useAgendamentoMutations';

export function useCustomerMutationsGroup() {
  return {
    customer: {
      create: useCreateCustomer(),
      update: useUpdateCustomer(),
      delete: useDeleteCustomer(),
      updateStatus: useUpdateCustomerStatus(),
      createLogin: useCreateCustomerLogin()
    },
    lead: {
      approve: useApproveLead(),
      take: useTakeLead(),
      delete: useDeleteLead(),
      updateStatus: useUpdateLeadStatus(),
      create: useCreateLead()
    },
    agendamento: {
      create: useCreateAgendamento()
    }
  };
}

