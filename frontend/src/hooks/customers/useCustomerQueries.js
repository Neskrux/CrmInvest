import {
  useCustomers,
  useConsultores,
  useClinicas,
  useAgendamentos,
  useFechamentos,
  useNovosLeads,
  useLeadsNegativos,
  useSolicitacoesCarteira
} from '../queries';

export function useCustomerQueries(options = {}) {
  const { podeAlterarStatus, isConsultorInterno, isAdmin, isClinica } = options;

  const customersQuery = useCustomers();
  const consultoresQuery = useConsultores();
  const clinicasQuery = useClinicas();
  const agendamentosQuery = useAgendamentos();
  const fechamentosQuery = useFechamentos();
  const novosLeadsQuery = useNovosLeads({ enabled: podeAlterarStatus || isConsultorInterno });
  const leadsNegativosQuery = useLeadsNegativos({ enabled: podeAlterarStatus || isConsultorInterno });
  const solicitacoesCarteiraQuery = useSolicitacoesCarteira({ enabled: isAdmin || isClinica });

  return {
    customers: customersQuery,
    consultores: consultoresQuery,
    clinicas: clinicasQuery,
    agendamentos: agendamentosQuery,
    fechamentos: fechamentosQuery,
    novosLeads: novosLeadsQuery,
    leadsNegativos: leadsNegativosQuery,
    solicitacoesCarteira: solicitacoesCarteiraQuery
  };
}

