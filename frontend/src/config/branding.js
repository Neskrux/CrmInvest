// Configuração de textos por empresa_id para páginas internas da plataforma
const BRANDING_BY_EMPRESA = {
  default: {
    // Textos padrão (empresa_id diferente de 5)
    pacientes: 'Pacientes',
    paciente: 'Paciente',
    consultores: 'Consultores',
    consultor: 'Consultor',
    consultora: 'Consultora',
    agendamentos: 'Agendamentos',
    agendamento: 'Agendamento',
    fechamentos: 'Fechamentos',
    fechamento: 'Fechamento',
    clinicas: 'Clínicas',
    clinica: 'Clínica',
    dashboard: 'Dashboard',
    carteira: 'Carteira',
    carteiraExistente: 'Carteira Existente',
    novosLeads: 'Novos Leads',
    leads: 'Leads',
    lead: 'Lead',
    status: 'Status',
    observacoes: 'Observações',
    documentos: 'Documentos',
    evidencia: 'Evidência',
    evidencias: 'Evidências',
    materiais: 'Materiais',
    perfil: 'Perfil',
    sair: 'Sair',
    editar: 'Editar',
    excluir: 'Excluir',
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    confirmar: 'Confirmar',
    fechar: 'Fechar',
    visualizar: 'Visualizar',
    adicionar: 'Adicionar',
    remover: 'Remover',
    filtrar: 'Filtrar',
    limpar: 'Limpar',
    buscar: 'Buscar',
    exportar: 'Exportar',
    importar: 'Importar',
    configurar: 'Configurar',
    ativo: 'Ativo',
    inativo: 'Inativo',
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    aguardando: 'Aguardando',
    emAndamento: 'Em Andamento',
    finalizado: 'Finalizado',
    tipoTratamento: 'Tipo de Tratamento',
    empreendimento: 'Empreendimento',
    // Mensagens específicas
    mensagens: {
      cadastroSucesso: 'Cadastro realizado com sucesso!',
      atualizacaoSucesso: 'Atualização realizada com sucesso!',
      exclusaoSucesso: 'Exclusão realizada com sucesso!',
      erroGenerico: 'Ocorreu um erro. Tente novamente.',
      confirmarExclusao: 'Tem certeza que deseja excluir este item?',
      dadosSalvos: 'Dados salvos com sucesso!',
      operacaoRealizada: 'Operação realizada com sucesso!'
    },
    
    // Configurações de interface
    interface: {
      dashboard: {
        mostrarFiltroRegiao: true,
        mostrarRankingConsultores: true,
        mostrarEstatisticasGeograficas: true,
        mostrarGraficosComparativos: true
      },
      pacientes: {
        mostrarFiltroCidade: true,
        mostrarFiltroEstado: true,
        mostrarFiltroConsultor: true
      },
      agendamentos: {
        mostrarFiltroRegiao: true,
        mostrarFiltroClinica: true
      },
      fechamentos: {
        mostrarFiltroRegiao: true,
        mostrarFiltroConsultor: true,
        mostrarFiltroClinica: true,
        mostrarAbaEmAnalise: true
      },
      leadsNegativos: {
        mostrarResumoEstatisticas: true
      },
      consultores: {
        mostrarCardsEstatisticas: true,
        mostrarBotaoGerarLinks: true,
        mostrarFiltroCorretores: true,
        mostrarTipoCorretor: true,
        mostrarBotaoLink: true
      }
    }
  },

  // Empresa ID 5 - Incorporadora (pacientes → clientes, consultores → corretores)
  5: {
    pacientes: 'Clientes',
    paciente: 'Cliente',
    consultores: 'Corretores',
    consultor: 'Corretor',
    consultora: 'Corretora',
    agendamentos: 'Agendamentos',
    agendamento: 'Agendamento',
    fechamentos: 'Fechamentos',
    fechamento: 'Fechamento',
    clinicas: 'Empreendimentos',
    clinica: 'Empreendimento',
    dashboard: 'Dashboard',
    carteira: 'Carteira',
    carteiraExistente: 'Carteira Existente',
    novosLeads: 'Novos Interessados',
    leads: 'Interessados',
    lead: 'Interessado',
    status: 'Status',
    observacoes: 'Observações',
    documentos: 'Documentos',
    evidencia: 'Evidência',
    evidencias: 'Evidências',
    materiais: 'Materiais',
    perfil: 'Perfil',
    sair: 'Sair',
    editar: 'Editar',
    excluir: 'Excluir',
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    confirmar: 'Confirmar',
    fechar: 'Fechar',
    visualizar: 'Visualizar',
    adicionar: 'Adicionar',
    remover: 'Remover',
    filtrar: 'Filtrar',
    limpar: 'Limpar',
    buscar: 'Buscar',
    exportar: 'Exportar',
    importar: 'Importar',
    configurar: 'Configurar',
    ativo: 'Ativo',
    inativo: 'Inativo',
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    aguardando: 'Aguardando',
    emAndamento: 'Em Andamento',
    finalizado: 'Finalizado',
    tipoTratamento: 'Empreendimento',
    empreendimento: 'Empreendimento',
    // Mensagens específicas
    mensagens: {
      cadastroSucesso: 'Cadastro realizado com sucesso!',
      atualizacaoSucesso: 'Atualização realizada com sucesso!',
      exclusaoSucesso: 'Exclusão realizada com sucesso!',
      erroGenerico: 'Ocorreu um erro. Tente novamente.',
      confirmarExclusao: 'Tem certeza que deseja excluir este item?',
      dadosSalvos: 'Dados salvos com sucesso!',
      operacaoRealizada: 'Operação realizada com sucesso!'
    },
    
    // Configurações de interface para Incorporadora (empresa_id 5)
    interface: {
      dashboard: {
        mostrarFiltroRegiao: false,  // ← REMOVER filtro de região para incorporadora
        mostrarRankingConsultores: true,
        mostrarEstatisticasGeograficas: false,  // ← REMOVER estatísticas geográficas
        mostrarGraficosComparativos: true
      },
      pacientes: {
        mostrarFiltroCidade: false,  // ← REMOVER filtro de cidade
        mostrarFiltroEstado: false,  // ← REMOVER filtro de estado
        mostrarFiltroConsultor: true
      },
      agendamentos: {
        mostrarFiltroRegiao: false,  // ← REMOVER filtro de região
        mostrarFiltroClinica: true
      },
      fechamentos: {
        mostrarFiltroRegiao: false,  // ← REMOVER filtro de região
        mostrarFiltroConsultor: true,
        mostrarFiltroClinica: false,  // ← REMOVER filtro de clínica para incorporadora
        mostrarAbaEmAnalise: false  // ← REMOVER aba "Em Análise" para incorporadora
      },
      leadsNegativos: {
        mostrarResumoEstatisticas: false  // ← REMOVER cards de estatísticas para incorporadora
      },
      consultores: {
        mostrarCardsEstatisticas: false,  // ← REMOVER cards de estatísticas para incorporadora
        mostrarBotaoGerarLinks: false,    // ← REMOVER botão "Gerar Links Freelancers" para incorporadora
        mostrarFiltroCorretores: false,   // ← REMOVER filtro de corretores para incorporadora
        mostrarTipoCorretor: false,       // ← REMOVER seção "Tipo de corretor" no modal para incorporadora
        mostrarBotaoLink: false           // ← REMOVER botão de link (laranja) na tabela para incorporadora
      }
    }
  }
};

export function getBrandingByEmpresa(empresaId) {
  if (!empresaId) return BRANDING_BY_EMPRESA.default;
  return BRANDING_BY_EMPRESA[empresaId] || BRANDING_BY_EMPRESA.default;
}
