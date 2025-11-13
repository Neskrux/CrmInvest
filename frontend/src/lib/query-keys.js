/**
 * Factory de Query Keys para React Query
 * Padrão enterprise: centralizar todas as query keys em um único lugar
 * Facilita invalidação e manutenção
 */

export const queryKeys = {
  // Customers/Pacientes
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters) => [...queryKeys.customers.lists(), { filters }] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id) => [...queryKeys.customers.details(), id] as const,
  },

  // Consultores
  consultores: {
    all: ['consultores'] as const,
    lists: () => [...queryKeys.consultores.all, 'list'] as const,
    list: (filters) => [...queryKeys.consultores.lists(), { filters }] as const,
    details: () => [...queryKeys.consultores.all, 'detail'] as const,
    detail: (id) => [...queryKeys.consultores.details(), id] as const,
    sdrs: () => [...queryKeys.consultores.all, 'sdrs'] as const,
  },

  // Clínicas
  clinicas: {
    all: ['clinicas'] as const,
    lists: () => [...queryKeys.clinicas.all, 'list'] as const,
    list: (filters) => [...queryKeys.clinicas.lists(), { filters }] as const,
    details: () => [...queryKeys.clinicas.all, 'detail'] as const,
    detail: (id) => [...queryKeys.clinicas.details(), id] as const,
  },

  // Agendamentos
  agendamentos: {
    all: ['agendamentos'] as const,
    lists: () => [...queryKeys.agendamentos.all, 'list'] as const,
    list: (filters) => [...queryKeys.agendamentos.lists(), { filters }] as const,
    details: () => [...queryKeys.agendamentos.all, 'detail'] as const,
    detail: (id) => [...queryKeys.agendamentos.details(), id] as const,
  },

  // Fechamentos
  fechamentos: {
    all: ['fechamentos'] as const,
    lists: () => [...queryKeys.fechamentos.all, 'list'] as const,
    list: (filters) => [...queryKeys.fechamentos.lists(), { filters }] as const,
    details: () => [...queryKeys.fechamentos.all, 'detail'] as const,
    detail: (id) => [...queryKeys.fechamentos.details(), id] as const,
    boletos: (fechamentoId) => [...queryKeys.fechamentos.detail(fechamentoId), 'boletos'] as const,
  },

  // Leads
  leads: {
    all: ['leads'] as const,
    novos: () => [...queryKeys.leads.all, 'novos'] as const,
    negativos: () => [...queryKeys.leads.all, 'negativos'] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id) => [...queryKeys.leads.details(), id] as const,
  },

  // Carteira
  carteira: {
    all: ['carteira'] as const,
    solicitacoes: () => [...queryKeys.carteira.all, 'solicitacoes'] as const,
    solicitacao: (id) => [...queryKeys.carteira.solicitacoes(), id] as const,
    contratos: (solicitacaoId) => [...queryKeys.carteira.solicitacao(solicitacaoId), 'contratos'] as const,
    antecipacoes: () => [...queryKeys.carteira.all, 'antecipacoes'] as const,
  },

  // Evidências
  evidencias: {
    all: ['evidencias'] as const,
    paciente: (pacienteId) => [...queryKeys.evidencias.all, 'paciente', pacienteId] as const,
  },
};

