import React, { useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import useBranding from '../../../hooks/common/useBranding';
import { useToast } from '../../../contexts';
import useSmartPolling from '../../../hooks/common/useSmartPolling';

import {
  useModalState,
  useFilterState,
  usePagination,
  useAntecipacaoState,
  useContratosState,
  useCarteiraState,
  useCustomerUIState,
  useNewCustomer,
  useCadastroClinicaState,
  useAgendamentoState,
  useLeadAtribuicaoState,
  useCustomerFilters,
  useLeadsNegativosFilters,
  useNovosLeadsFilters,
  useModalBodyLock,
  useCustomerQueries,
  useCustomerMutationsGroup,
  useStatusInfo,
  useAutoFilterConsultor,
  useTabValidation,
  useEvidenciaData
} from '../../../hooks';

import {
  useSdrsIncorporadora,
  useBoletosClinica,
  useSolicitacoesAntecipacao,
  useContratosCarteira
} from '../../../hooks/queries';

import { ESTADOS_BRASILEIROS, CIDADES_POR_ESTADO } from '../../../constants/estados';
import { STATUS_COM_EVIDENCIA } from '../../../constants/status';
import { limitarCaracteres } from '../../../utils/formatters';
import { preencherDadosTesteCarteira } from '../../../utils/carteira';
import { queryKeys } from '../../../lib/query-keys';

import styles from './Customers.module.css';

const Customers = () => {
  const { t, empresaId, shouldShow } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { 
    makeRequest,
    user, 
    isAdmin, 
    podeAlterarStatus, 
    isConsultorInterno, 
    isFreelancer, 
    isClinica,
    deveFiltrarPorConsultor,
    podeVerTodosDados,
    isIncorporadora,
    deveFiltrarPorClinica
  } = useAuth();
  const { showSuccessToast, showErrorToast, showInfoToast } = useToast();

  const isConsultor = useMemo(() => user?.tipo === 'consultor', [user?.tipo]);

  const isCalculoCarteira = useMemo(() => location.pathname === '/calculo-carteira', [location.pathname]);

  const [activeTab, setActiveTab] = useState(() => {
    if (isCalculoCarteira && !isClinica) return 'carteira-existente';
    if (isClinica) return 'meus-pacientes';
    return 'pacientes';
  });

  const { modals, openModal, closeModal } = useModalState();
  const { 
    filters, 
    filtersNovosLeads, 
    filtersNegativos, 
    updateFilter, 
    updateFilterNovosLeads, 
    updateFilterNegativos 
  } = useFilterState();

  const uiState = useCustomerUIState();
  const { gerandoLogin, setGerandoLogin } = uiState;
  const carteiraState = useCarteiraState();
  const antecipacaoState = useAntecipacaoState();
  const contratosState = useContratosState();
  const agendamentoState = useAgendamentoState();
  const leadAtribuicaoState = useLeadAtribuicaoState();
  const novoClienteState = useNewCustomer();
  const cadastroClinicaState = useCadastroClinicaState();

  const evidenciaData = useEvidenciaData();
  const { statusOptions, getStatusInfo } = useStatusInfo(t);

  const queries = useCustomerQueries({
    podeAlterarStatus,
    isConsultorInterno,
    isAdmin,
    isClinica
  });

  const {
    data: customers = [],
    isLoading: loadingCustomers
  } = queries.customers;
  const { data: consultores = [] } = queries.consultores;
  const { data: clinicas = [] } = queries.clinicas;
  const { data: agendamentos = [] } = queries.agendamentos;
  const { data: fechamentos = [] } = queries.fechamentos;
  const { data: novosLeads = [] } = queries.novosLeads;
  const { data: leadsNegativos = [] } = queries.leadsNegativos;
  const { data: solicitacoesCarteira = [] } = queries.solicitacoesCarteira;

  const { data: sdrsIncorporadora = [] } = useSdrsIncorporadora();
  const { data: boletosPorPaciente = {}, isLoading: carregandoBoletosClinica } = useBoletosClinica(fechamentos, isClinica, user?.clinica_id);
  const { data: solicitacoesAntecipacao = [], isLoading: carregandoSolicitacoesAntecipacao } = useSolicitacoesAntecipacao({ enabled: isAdmin || isClinica });
  const { data: contratos = [] } = useContratosCarteira(contratosState.solicitacaoSelecionada?.id);

  const mutations = useCustomerMutationsGroup();

  const pollingCallback = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.agendamentos.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.fechamentos.all });
    
    if (podeAlterarStatus || isConsultorInterno) {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    }
    
    if (isAdmin || isClinica) {
      queryClient.invalidateQueries({ queryKey: queryKeys.carteira.all });
    }
  }, [queryClient, podeAlterarStatus, isConsultorInterno, isAdmin, isClinica]);

  useSmartPolling(pollingCallback, 120000, [podeAlterarStatus, isConsultorInterno, isConsultor]);

  useAutoFilterConsultor(deveFiltrarPorConsultor, user?.consultor_id, updateFilter);

  const customersFiltrados = useCustomerFilters(customers, {
    nome: filters.nome,
    telefone: filters.telefone,
    cpf: filters.cpf,
    tipo: filters.tipo,
    status: filters.status,
    consultor: filters.consultor,
    dataInicio: filters.dataInicio,
    dataFim: filters.dataFim
  });

  const leadsNegativosFiltrados = useLeadsNegativosFilters(leadsNegativos, {
    nome: filtersNegativos.nome,
    status: filtersNegativos.status,
    consultor: filtersNegativos.consultor
  });

  const novosLeadsFiltrados = useNovosLeadsFilters(novosLeads, {
    nome: filtersNovosLeads.nome,
    status: filtersNovosLeads.status,
    empreendimento: filtersNovosLeads.empreendimento
  });

  const {
    currentPage,
    totalPages,
    paginatedItems: customersPaginados,
    setCurrentPage
  } = usePagination(customersFiltrados, 10, [
    filters.nome,
    filters.telefone,
    filters.cpf,
    filters.tipo,
    filters.status,
    filters.consultor,
    filters.dataInicio,
    filters.dataFim
  ]);

  useModalBodyLock(modals);
  useTabValidation(user, podeAlterarStatus, isConsultorInterno, activeTab, setActiveTab);

  return (
    <div>
      <div className="page-header">
        <div>
          <div>
            <h1 className="page-title">Meus clientes</h1>
            <p className="page-subtitle">Acompanhe o status de seus clientes</p>
          </div>
        </div>
      </div>

      {loadingCustomers ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div>
          <p>Total de clientes: {customersFiltrados.length}</p>
          <p>Página {currentPage} de {totalPages}</p>
        </div>
      )}
    </div>
  );
};

export default Customers;