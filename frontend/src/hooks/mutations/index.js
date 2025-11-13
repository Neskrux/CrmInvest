export {
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useUpdateCustomerStatus,
  useCreateCustomerLogin,
  useUploadCustomerDocument
} from './useCustomerMutations';

export {
  useApproveLead,
  useTakeLead,
  useDeleteLead,
  useUpdateLeadStatus,
  useCreateLead
} from './useLeadMutations';

export {
  useCreateSolicitacaoCarteira,
  useDeleteSolicitacaoCarteira,
  useUpdateSolicitacaoCarteiraStatus,
  useCreateSolicitacaoAntecipacao,
  useUploadContratoCarteira,
  useApproveContratoCarteira,
  useReproveContratoCarteira,
  useDeleteContratoCarteira
} from './useCarteiraMutations';

export { useCreateAgendamento } from './useAgendamentoMutations';

