/**
 * Hook para gerenciar filtros de Customers/Pacientes
 */
import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useBranding from './useBranding';

/**
 * Mapa de empreendimentos para incorporadora
 */
const EMPREENDIMENTO_MAP = {
  4: 'Laguna Sky Garden',
  5: 'Residencial Girassol',
  6: 'Sintropia Sky Garden',
  7: 'Residencial Lotus',
  8: 'River Sky Garden',
  9: 'Condomínio Figueira Garcia'
};

/**
 * Hook para filtrar customers/pacientes
 */
export function useCustomerFilters(customers, filters) {
  const { user, isAdmin, isConsultorInterno, isFreelancer, isIncorporadora } = useAuth();
  const { empresaId } = useBranding();

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];

    return customers.filter(p => {
      // Verificar se é um paciente sem consultor
      const semConsultor = !p.consultor_id || p.consultor_id === '' || p.consultor_id === null || p.consultor_id === undefined || Number(p.consultor_id) === 0;
      
      // Verificar se é um lead capturado por SDR (tem sdr_id mas não consultor_id)
      const capturadoPorSDR = p.sdr_id && semConsultor;
      
      // Pacientes com status 'fechado' sempre aparecem (cadastrados por clínicas)
      if (p.status === 'fechado' && semConsultor) {
        // Continuar com filtros abaixo
      } else {
        // Para freelancers: mostrar todos os pacientes indicados por eles
        if (isFreelancer) {
          if (p.consultor_id && Number(p.consultor_id) === Number(user?.consultor_id)) {
            // Continuar com filtros
          } else {
            return false; // Não mostrar pacientes de outros consultores
          }
        } else {
          // Para não-freelancers: lógica original
          // Admins e consultores internos veem todos os pacientes
          // Leads não atribuídos (sem consultor_id) NÃO devem aparecer aqui para ninguém
          if (!isAdmin && !isConsultorInterno && semConsultor) return false;
          
          // Para consultores internos e admins, remover leads não atribuídos da aba "Geral"
          // EXCETO se foram capturados por SDR (têm sdr_id)
          if ((isAdmin || isConsultorInterno) && semConsultor && !capturadoPorSDR) return false;
        }
      }

      // Aplicar filtros de busca
      const matchNome = !filters.nome || p.nome?.toLowerCase().includes(filters.nome.toLowerCase());
      const matchTelefone = !filters.telefone || (p.telefone || '').includes(filters.telefone);
      const matchCPF = !filters.cpf || (p.cpf || '').includes(filters.cpf);
      
      // Filtro por tipo/empreendimento
      const matchTipo = !filters.tipo || (
        isIncorporadora ? (
          // Para incorporadora, comparar nome do empreendimento
          (() => {
            const externo = (p.empreendimento_externo || '').trim();
            const nomeEmpreendimento = externo || EMPREENDIMENTO_MAP[p.empreendimento_id] || '';
            return nomeEmpreendimento === filters.tipo;
          })()
        ) : (
          // Para outras empresas, comparar tipo de tratamento
          p.tipo_tratamento === filters.tipo
        )
      );
      
      const matchStatus = !filters.status || p.status === filters.status;

      // Filtro por consultor
      const matchConsultor = !filters.consultor || 
        String(p.consultor_id) === filters.consultor ||
        String(p.sdr_id) === filters.consultor ||
        String(p.consultor_interno_id) === filters.consultor;
      
      // Filtro por data de cadastro
      let matchData = true;
      if (filters.dataInicio || filters.dataFim) {
        const dataCadastro = p.created_at ? new Date(p.created_at) : null;
        if (dataCadastro) {
          const dataCadastroNormalizada = new Date(
            dataCadastro.getFullYear(), 
            dataCadastro.getMonth(), 
            dataCadastro.getDate()
          );
          
          if (filters.dataInicio) {
            const dataInicio = new Date(filters.dataInicio);
            const dataInicioNormalizada = new Date(
              dataInicio.getFullYear(), 
              dataInicio.getMonth(), 
              dataInicio.getDate()
            );
            matchData = matchData && dataCadastroNormalizada >= dataInicioNormalizada;
          }
          
          if (filters.dataFim) {
            const dataFim = new Date(filters.dataFim);
            const dataFimNormalizada = new Date(
              dataFim.getFullYear(), 
              dataFim.getMonth(), 
              dataFim.getDate()
            );
            matchData = matchData && dataCadastroNormalizada <= dataFimNormalizada;
          }
        } else {
          // Se não tem data de cadastro mas não há filtro restritivo, mostrar
          matchData = !filters.dataInicio && !filters.dataFim;
        }
      }
      
      return matchNome && matchTelefone && matchCPF && matchTipo && matchStatus && matchConsultor && matchData;
    });
  }, [customers, filters, user, isAdmin, isConsultorInterno, isFreelancer, isIncorporadora]);

  return filteredCustomers;
}

/**
 * Hook para filtrar leads negativos
 */
export function useLeadsNegativosFilters(leadsNegativos, filters) {
  const filteredLeads = useMemo(() => {
    if (!Array.isArray(leadsNegativos)) return [];

    return leadsNegativos.filter(lead => {
      const matchNome = !filters.nome || lead.nome?.toLowerCase().includes(filters.nome.toLowerCase());
      const matchStatus = !filters.status || lead.status === filters.status;
      const matchConsultor = !filters.consultor || 
        String(lead.consultor_id) === filters.consultor ||
        String(lead.sdr_id) === filters.consultor ||
        String(lead.consultor_interno_id) === filters.consultor;
      
      return matchNome && matchStatus && matchConsultor;
    });
  }, [leadsNegativos, filters]);

  return filteredLeads;
}

/**
 * Hook para filtrar novos leads
 */
export function useNovosLeadsFilters(novosLeads, filters) {
  const filteredLeads = useMemo(() => {
    if (!Array.isArray(novosLeads)) return [];

    return novosLeads.filter(lead => {
      const matchNome = !filters.nome || lead.nome?.toLowerCase().includes(filters.nome.toLowerCase());
      const matchStatus = !filters.status || lead.status === filters.status;
      const matchEmpreendimento = !filters.empreendimento || 
        String(lead.empreendimento_id) === filters.empreendimento;
      
      return matchNome && matchStatus && matchEmpreendimento;
    });
  }, [novosLeads, filters]);

  return filteredLeads;
}

