import { formatarTelefone, formatarCNPJ, formatarCPF, formatarMoeda, formatarData, formatarDataHora } from './helpers';

/**
 * Funções de formatação específicas para diferentes tipos de dados
 */

/**
 * Formata dados de usuário para exibição
 */
export const formatarUsuario = (usuario: any): any => {
  if (!usuario) return null;
  
  return {
    ...usuario,
    email: usuario.email?.toLowerCase().trim(),
    nome: usuario.nome?.trim(),
    telefone: usuario.telefone ? formatarTelefone(usuario.telefone) : usuario.telefone,
    cpf: usuario.cpf ? formatarCPF(usuario.cpf) : usuario.cpf,
    cnpj: usuario.cnpj ? formatarCNPJ(usuario.cnpj) : usuario.cnpj
  };
};

/**
 * Formata dados de paciente para exibição
 */
export const formatarPaciente = (paciente: any): any => {
  if (!paciente) return null;
  
  return {
    ...paciente,
    nome: paciente.nome?.trim(),
    email: paciente.email?.toLowerCase().trim(),
    telefone: paciente.telefone ? formatarTelefone(paciente.telefone) : paciente.telefone,
    cpf: paciente.cpf ? formatarCPF(paciente.cpf) : paciente.cpf,
    data_nascimento: paciente.data_nascimento ? formatarData(paciente.data_nascimento) : paciente.data_nascimento,
    created_at: paciente.created_at ? formatarDataHora(paciente.created_at) : paciente.created_at,
    updated_at: paciente.updated_at ? formatarDataHora(paciente.updated_at) : paciente.updated_at
  };
};

/**
 * Formata dados de clínica para exibição
 */
export const formatarClinica = (clinica: any): any => {
  if (!clinica) return null;
  
  return {
    ...clinica,
    nome: clinica.nome?.trim(),
    email: clinica.email?.toLowerCase().trim(),
    telefone: clinica.telefone ? formatarTelefone(clinica.telefone) : clinica.telefone,
    cnpj: clinica.cnpj ? formatarCNPJ(clinica.cnpj) : clinica.cnpj,
    cep: clinica.cep ? formatarCEP(clinica.cep) : clinica.cep,
    created_at: clinica.created_at ? formatarDataHora(clinica.created_at) : clinica.created_at,
    updated_at: clinica.updated_at ? formatarDataHora(clinica.updated_at) : clinica.updated_at
  };
};

/**
 * Formata dados de agendamento para exibição
 */
export const formatarAgendamento = (agendamento: any): any => {
  if (!agendamento) return null;
  
  return {
    ...agendamento,
    data_agendamento: agendamento.data_agendamento ? formatarData(agendamento.data_agendamento) : agendamento.data_agendamento,
    horario: agendamento.horario ? formatarHorario(agendamento.horario) : agendamento.horario,
    created_at: agendamento.created_at ? formatarDataHora(agendamento.created_at) : agendamento.created_at,
    updated_at: agendamento.updated_at ? formatarDataHora(agendamento.updated_at) : agendamento.updated_at
  };
};

/**
 * Formata dados de fechamento para exibição
 */
export const formatarFechamento = (fechamento: any): any => {
  if (!fechamento) return null;
  
  return {
    ...fechamento,
    valor_fechado: fechamento.valor_fechado ? formatarMoeda(fechamento.valor_fechado) : fechamento.valor_fechado,
    data_fechamento: fechamento.data_fechamento ? formatarData(fechamento.data_fechamento) : fechamento.data_fechamento,
    created_at: fechamento.created_at ? formatarDataHora(fechamento.created_at) : fechamento.created_at,
    updated_at: fechamento.updated_at ? formatarDataHora(fechamento.updated_at) : fechamento.updated_at
  };
};

/**
 * Formata dados de lead para exibição
 */
export const formatarLead = (lead: any): any => {
  if (!lead) return null;
  
  return {
    ...lead,
    nome: lead.nome?.trim(),
    email: lead.email?.toLowerCase().trim(),
    telefone: lead.telefone ? formatarTelefone(lead.telefone) : lead.telefone,
    created_at: lead.created_at ? formatarDataHora(lead.created_at) : lead.created_at,
    updated_at: lead.updated_at ? formatarDataHora(lead.updated_at) : lead.updated_at
  };
};

/**
 * Formata dados de consultor para exibição
 */
export const formatarConsultor = (consultor: any): any => {
  if (!consultor) return null;
  
  return {
    ...consultor,
    nome: consultor.nome?.trim(),
    email: consultor.email?.toLowerCase().trim(),
    telefone: consultor.telefone ? formatarTelefone(consultor.telefone) : consultor.telefone,
    pix: consultor.pix?.trim(),
    created_at: consultor.created_at ? formatarDataHora(consultor.created_at) : consultor.created_at,
    updated_at: consultor.updated_at ? formatarDataHora(consultor.updated_at) : consultor.updated_at
  };
};

/**
 * Formata horário para exibição
 */
export const formatarHorario = (horario: string): string => {
  if (!horario) return '';
  
  // Se já está no formato HH:MM, retorna como está
  if (/^\d{2}:\d{2}$/.test(horario)) {
    return horario;
  }
  
  // Se está no formato HHMM, converte para HH:MM
  if (/^\d{4}$/.test(horario)) {
    return `${horario.substring(0, 2)}:${horario.substring(2)}`;
  }
  
  return horario;
};

/**
 * Formata CEP para exibição
 */
export const formatarCEP = (cep: string): string => {
  if (!cep) return '';
  
  const numeros = cep.replace(/\D/g, '');
  
  if (numeros.length === 8) {
    return `${numeros.substring(0, 5)}-${numeros.substring(5)}`;
  }
  
  return cep;
};

/**
 * Formata endereço completo
 */
export const formatarEndereco = (endereco: any): string => {
  if (!endereco) return '';
  
  const partes = [];
  
  if (endereco.logradouro) partes.push(endereco.logradouro);
  if (endereco.numero) partes.push(endereco.numero);
  if (endereco.complemento) partes.push(endereco.complemento);
  if (endereco.bairro) partes.push(endereco.bairro);
  if (endereco.cidade) partes.push(endereco.cidade);
  if (endereco.estado) partes.push(endereco.estado);
  if (endereco.cep) partes.push(formatarCEP(endereco.cep));
  
  return partes.join(', ');
};

/**
 * Formata status para exibição
 */
export const formatarStatus = (status: string, tipo: string = 'geral'): string => {
  if (!status) return '';
  
  const statusMap: Record<string, Record<string, string>> = {
    paciente: {
      'novo': 'Novo',
      'contatado': 'Contatado',
      'agendado': 'Agendado',
      'confirmado': 'Confirmado',
      'fechado': 'Fechado',
      'perdido': 'Perdido'
    },
    clinica: {
      'ativa': 'Ativa',
      'inativa': 'Inativa',
      'bloqueada': 'Bloqueada'
    },
    agendamento: {
      'agendado': 'Agendado',
      'confirmado': 'Confirmado',
      'cancelado': 'Cancelado',
      'realizado': 'Realizado'
    },
    fechamento: {
      'pendente': 'Pendente',
      'aprovado': 'Aprovado',
      'rejeitado': 'Rejeitado'
    },
    usuario: {
      'admin': 'Administrador',
      'consultor': 'Consultor',
      'clinica': 'Clínica',
      'empresa': 'Empresa',
      'root': 'Root'
    }
  };
  
  const tipoMap = statusMap[tipo] || statusMap['geral'] || {};
  return tipoMap[status.toLowerCase()] || status;
};

/**
 * Formata tipo de usuário para exibição
 */
export const formatarTipoUsuario = (tipo: string): string => {
  return formatarStatus(tipo, 'usuario');
};

/**
 * Formata dados de arquivo para exibição
 */
export const formatarArquivo = (arquivo: any): any => {
  if (!arquivo) return null;
  
  return {
    ...arquivo,
    nome: arquivo.nome?.trim(),
    tamanho: arquivo.tamanho ? formatarBytes(arquivo.tamanho) : arquivo.tamanho,
    data_upload: arquivo.data_upload ? formatarDataHora(arquivo.data_upload) : arquivo.data_upload
  };
};

/**
 * Formata bytes para formato legível
 */
export const formatarBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formata duração em minutos para formato legível
 */
export const formatarDuracao = (minutos: number): string => {
  if (minutos < 60) {
    return `${minutos}min`;
  }
  
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  
  if (minutosRestantes === 0) {
    return `${horas}h`;
  }
  
  return `${horas}h ${minutosRestantes}min`;
};

/**
 * Formata idade
 */
export const formatarIdade = (dataNascimento: string | Date): string => {
  if (!dataNascimento) return '';
  
  const nascimento = typeof dataNascimento === 'string' ? new Date(dataNascimento) : dataNascimento;
  const hoje = new Date();
  
  if (isNaN(nascimento.getTime())) return '';
  
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();
  
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return `${idade} anos`;
};

/**
 * Formata percentual
 */
export const formatarPercentual = (valor: number, casasDecimais: number = 1): string => {
  return `${valor.toFixed(casasDecimais)}%`;
};

/**
 * Formata número com separadores de milhares
 */
export const formatarNumero = (numero: number): string => {
  return new Intl.NumberFormat('pt-BR').format(numero);
};

/**
 * Formata data relativa (há X tempo)
 */
export const formatarDataRelativa = (data: string | Date): string => {
  if (!data) return '';
  
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  const agora = new Date();
  
  if (isNaN(dataObj.getTime())) return '';
  
  const diffMs = agora.getTime() - dataObj.getTime();
  const diffSegundos = Math.floor(diffMs / 1000);
  const diffMinutos = Math.floor(diffSegundos / 60);
  const diffHoras = Math.floor(diffMinutos / 60);
  const diffDias = Math.floor(diffHoras / 24);
  const diffSemanas = Math.floor(diffDias / 7);
  const diffMeses = Math.floor(diffDias / 30);
  const diffAnos = Math.floor(diffDias / 365);
  
  if (diffSegundos < 60) return 'agora mesmo';
  if (diffMinutos < 60) return `há ${diffMinutos} minuto${diffMinutos !== 1 ? 's' : ''}`;
  if (diffHoras < 24) return `há ${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
  if (diffDias < 7) return `há ${diffDias} dia${diffDias !== 1 ? 's' : ''}`;
  if (diffSemanas < 4) return `há ${diffSemanas} semana${diffSemanas !== 1 ? 's' : ''}`;
  if (diffMeses < 12) return `há ${diffMeses} mês${diffMeses !== 1 ? 'es' : ''}`;
  return `há ${diffAnos} ano${diffAnos !== 1 ? 's' : ''}`;
};

/**
 * Formata lista de itens
 */
export const formatarLista = (itens: any[], separador: string = ', ', ultimoSeparador: string = ' e '): string => {
  if (!itens || itens.length === 0) return '';
  if (itens.length === 1) return itens[0];
  if (itens.length === 2) return itens.join(ultimoSeparador);
  
  const todosMenosUltimo = itens.slice(0, -1);
  const ultimo = itens[itens.length - 1];
  
  return todosMenosUltimo.join(separador) + ultimoSeparador + ultimo;
};

/**
 * Formata dados de API para resposta padronizada
 */
export const formatarRespostaAPI = (data: any, mensagem: string = 'Operação realizada com sucesso', sucesso: boolean = true): any => {
  return {
    success: sucesso,
    message: mensagem,
    data: data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Formata dados de erro para resposta padronizada
 */
export const formatarErroAPI = (erro: string | Error, codigo: number = 500): any => {
  const mensagem = typeof erro === 'string' ? erro : erro.message;
  
  return {
    success: false,
    error: mensagem,
    timestamp: new Date().toISOString(),
    code: codigo
  };
};

/**
 * Formata dados de paginação
 */
export const formatarPaginacao = (dados: any[], pagina: number, limite: number, total: number): any => {
  const totalPaginas = Math.ceil(total / limite);
  
  return {
    dados,
    paginacao: {
      pagina_atual: pagina,
      limite,
      total,
      total_paginas: totalPaginas,
      tem_proxima: pagina < totalPaginas,
      tem_anterior: pagina > 1
    }
  };
};

/**
 * Formata dados de estatísticas
 */
export const formatarEstatisticas = (dados: any): any => {
  if (!dados) return null;
  
  return {
    ...dados,
    // Formatar valores monetários se existirem
    valor_total: dados.valor_total ? formatarMoeda(dados.valor_total) : dados.valor_total,
    valor_medio: dados.valor_medio ? formatarMoeda(dados.valor_medio) : dados.valor_medio,
    
    // Formatar percentuais se existirem
    percentual_sucesso: dados.percentual_sucesso ? formatarPercentual(dados.percentual_sucesso) : dados.percentual_sucesso,
    percentual_conversao: dados.percentual_conversao ? formatarPercentual(dados.percentual_conversao) : dados.percentual_conversao,
    
    // Formatar datas se existirem
    data_inicio: dados.data_inicio ? formatarData(dados.data_inicio) : dados.data_inicio,
    data_fim: dados.data_fim ? formatarData(dados.data_fim) : dados.data_fim,
    
    // Formatar números se existirem
    total_registros: dados.total_registros ? formatarNumero(dados.total_registros) : dados.total_registros,
    total_pacientes: dados.total_pacientes ? formatarNumero(dados.total_pacientes) : dados.total_pacientes,
    total_clinicas: dados.total_clinicas ? formatarNumero(dados.total_clinicas) : dados.total_clinicas
  };
};
