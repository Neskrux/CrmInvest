const { supabase, supabaseAdmin } = require('../config/database');

// GET /api/dashboard - Dashboard principal
const getDashboard = async (req, res) => {
  try {
    // Obter data atual do sistema (dinâmica/real)
    const agora = new Date();
    const hoje = agora.getFullYear() + '-' + 
                 String(agora.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(agora.getDate()).padStart(2, '0');

    // Configurar filtros baseados no tipo de usuário
    const isConsultor = req.user.tipo === 'consultor';
    const isClinica = req.user.tipo === 'clinica';
    const isAdmin = req.user.tipo === 'admin';
    const isParceiro = req.user.tipo === 'parceiro';
    const consultorId = req.user.id;
    const clinicaId = req.user.clinica_id;
    const empresaId = req.user.empresa_id;

    // Buscar agendamentos de hoje
    let agendamentosQuery = supabase
      .from('agendamentos')
      .select('*')
      .eq('data_agendamento', hoje);
    
    if (isClinica) {
      agendamentosQuery = agendamentosQuery.eq('clinica_id', clinicaId);
    } else if (isConsultor && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      // Para consultores freelancers, filtrar apenas seus agendamentos
      agendamentosQuery = agendamentosQuery.eq('consultor_id', consultorId);
    } else if (((isAdmin || isParceiro) && empresaId) || 
               (isConsultor && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && empresaId)) {
      // Para admin, parceiro ou consultor interno, filtrar agendamentos da empresa
      agendamentosQuery = agendamentosQuery.eq('empresa_id', empresaId);
    }

    const { data: agendamentosHoje, error: error1 } = await agendamentosQuery;
    if (error1) throw error1;

    // Buscar lembrados de hoje
    let lembradosQuery = supabase
      .from('agendamentos')
      .select('*')
      .eq('data_agendamento', hoje)
      .eq('lembrado', true);
    
    if (isClinica) {
      lembradosQuery = lembradosQuery.eq('clinica_id', clinicaId);
    } else if (isConsultor && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      // Para consultores freelancers, filtrar apenas seus lembrados
      lembradosQuery = lembradosQuery.eq('consultor_id', consultorId);
    } else if (((isAdmin || isParceiro) && empresaId) || 
               (isConsultor && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && empresaId)) {
      // Para admin, parceiro ou consultor interno, filtrar lembrados da empresa
      lembradosQuery = lembradosQuery.eq('empresa_id', empresaId);
    }

    const { data: lembradosHoje, error: error2 } = await lembradosQuery;
    if (error2) throw error2;

    // Buscar total de pacientes
    let pacientesQuery = supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true });

    // Para clínica, contar apenas pacientes com agendamentos nesta clínica
    if (isClinica) {
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', clinicaId);

      if (agendError) throw agendError;

      const pacienteIds = [...new Set(agendamentos.map(a => a.paciente_id))];
      
      if (pacienteIds.length > 0) {
        pacientesQuery = pacientesQuery.in('id', pacienteIds);
      } else {
        pacientesQuery = pacientesQuery.eq('id', 0); // Força resultado vazio
      }
    }
    // Para consultor, contar apenas pacientes com agendamentos dele
    else if (isConsultor) {
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', consultorId);

      if (agendError) throw agendError;

      const pacienteIds = [...new Set(agendamentos.map(a => a.paciente_id))];
      
      if (pacienteIds.length > 0) {
        pacientesQuery = pacientesQuery.in('id', pacienteIds);
      } else {
        pacientesQuery = pacientesQuery.eq('id', 0); // Força resultado vazio
      }
    }
    // Para admin ou parceiro, contar apenas pacientes dos consultores da empresa
    else if ((isAdmin || isParceiro) && empresaId) {
      // Buscar consultores da empresa
      const { data: consultores, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id')
        .eq('empresa_id', empresaId);

      if (consultorError) throw consultorError;

      const consultorIds = consultores ? consultores.map(c => c.id) : [];
      
      if (consultorIds.length > 0) {
        pacientesQuery = pacientesQuery.in('consultor_id', consultorIds);
      } else {
        pacientesQuery = pacientesQuery.eq('id', 0); // Força resultado vazio
      }
    }

    const { count: totalPacientes, error: error3 } = await pacientesQuery;
    if (error3) throw error3;

    // Buscar fechamentos
    let fechamentosQuery = supabaseAdmin
      .from('fechamentos')
      .select('*');
    
    if (isClinica) {
      // Para clínica, buscar fechamentos dos pacientes com agendamentos nesta clínica
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', clinicaId);

      if (agendError) throw agendError;

      const pacienteIds = [...new Set(agendamentos.map(a => a.paciente_id))];
      
      if (pacienteIds.length > 0) {
        fechamentosQuery = fechamentosQuery.in('paciente_id', pacienteIds);
      } else {
        fechamentosQuery = fechamentosQuery.eq('id', 0); // Força resultado vazio
      }
    } else if (isConsultor) {
      fechamentosQuery = fechamentosQuery.eq('consultor_id', consultorId);
    } else if ((isAdmin || isParceiro) && empresaId) {
      // Para admin ou parceiro, buscar fechamentos de consultores da empresa
      fechamentosQuery = fechamentosQuery.eq('empresa_id', empresaId);
    }

    const { data: fechamentos, error: error5 } = await fechamentosQuery;
    if (error5) throw error5;

    // Estatísticas de fechamentos
    const fechamentosHoje = fechamentos.filter(f => f.data_fechamento === hoje && f.aprovado !== 'reprovado').length;
    
    const fechamentosMes = fechamentos.filter(f => {
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      const dataFechamento = new Date(f.data_fechamento + 'T12:00:00'); // Forçar meio-dia para evitar timezone
      return dataFechamento.getMonth() === mesAtual && dataFechamento.getFullYear() === anoAtual && f.aprovado !== 'reprovado';
    });

    const valorTotalMes = fechamentosMes.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);
    const ticketMedio = fechamentosMes.length > 0 ? (valorTotalMes / fechamentosMes.length) : 0;

    // Buscar consultores
    let consultoresQuery = supabase
      .from('consultores')
      .select('id, nome');

    // Se for consultor, buscar apenas dados dele
    if (isConsultor) {
      consultoresQuery = consultoresQuery.eq('id', consultorId);
    } else if ((isAdmin || isParceiro) && empresaId) {
      // Para admin ou parceiro, buscar apenas consultores da empresa
      consultoresQuery = consultoresQuery.eq('empresa_id', empresaId);
    }

    const { data: consultores, error: error4 } = await consultoresQuery;
    if (error4) throw error4;

    // Buscar todos os agendamentos
    let agendamentosConsultorQuery = supabase
      .from('agendamentos')
      .select('id, consultor_id, lembrado, data_agendamento');

    if (isClinica) {
      agendamentosConsultorQuery = agendamentosConsultorQuery.eq('clinica_id', clinicaId);
    } else if (isConsultor) {
      agendamentosConsultorQuery = agendamentosConsultorQuery.eq('consultor_id', consultorId);
    } else if ((isAdmin || isParceiro) && empresaId) {
      agendamentosConsultorQuery = agendamentosConsultorQuery.eq('empresa_id', empresaId);
    }

    const { data: todosAgendamentos, error: agendError } = await agendamentosConsultorQuery;
    if (agendError) throw agendError;

    // Buscar todos os fechamentos
    let fechamentosConsultorQuery = supabaseAdmin
      .from('fechamentos')
      .select('id, consultor_id, valor_fechado, data_fechamento, paciente_id');

    if (isClinica) {
      // Buscar pacientes com agendamentos nesta clínica para filtrar fechamentos
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', clinicaId);

      if (agendError) throw agendError;

      const pacienteIds = [...new Set(agendamentos.map(a => a.paciente_id))];
      
      if (pacienteIds.length > 0) {
        fechamentosConsultorQuery = fechamentosConsultorQuery.in('paciente_id', pacienteIds);
      } else {
        fechamentosConsultorQuery = fechamentosConsultorQuery.eq('id', 0); // Força resultado vazio
      }
    } else if (isConsultor) {
      fechamentosConsultorQuery = fechamentosConsultorQuery.eq('consultor_id', consultorId);
    } else if ((isAdmin || isParceiro) && empresaId) {
      fechamentosConsultorQuery = fechamentosConsultorQuery.eq('empresa_id', empresaId);
    }

    const { data: todosFechamentos, error: fechError } = await fechamentosConsultorQuery;
    if (fechError) throw fechError;

    // Processar estatísticas dos consultores (não mostrar para clínicas)
    const estatisticasConsultores = isClinica ? [] : consultores.map(consultor => {
      // Filtrar agendamentos do consultor
      const agendamentos = todosAgendamentos.filter(a => a.consultor_id === consultor.id);
      
      // Filtrar fechamentos do consultor
      const fechamentosConsultor = todosFechamentos.filter(f => f.consultor_id === consultor.id);
      
      const fechamentosConsultorMes = fechamentosConsultor.filter(f => {
        const anoAtual = new Date().getFullYear();
        const dataFechamento = new Date(f.data_fechamento + 'T12:00:00'); // Forçar meio-dia para evitar timezone
        return dataFechamento.getFullYear() === anoAtual && f.aprovado !== 'reprovado'; // Mostrar fechamentos do ano todo
      });

      const valorTotalConsultor = fechamentosConsultorMes.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);

      return {
        id: consultor.id,
        nome: consultor.nome,
        total_agendamentos: agendamentos.length,
        total_lembrados: agendamentos.filter(a => a.lembrado).length,
        agendamentos_hoje: agendamentos.filter(a => a.data_agendamento === hoje).length,
        fechamentos_mes: fechamentosConsultorMes.length,
        valor_total_mes: valorTotalConsultor
      };
    });

    res.json({
      agendamentosHoje: agendamentosHoje.length,
      lembradosHoje: lembradosHoje.length,
      totalPacientes,
      fechamentosHoje,
      fechamentosMes: fechamentosMes.length,
      valorTotalMes,
      ticketMedio,
      totalFechamentos: fechamentos.filter(f => f.aprovado !== 'reprovado').length,
      estatisticasConsultores
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/gerais/pacientes - Dados gerais de pacientes (para gráficos)
const getGeraisPacientes = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('pacientes')
      .select(`
        *,
        empreendimentos(nome, cidade, estado)
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros baseados no tipo de usuário
    const isAdmin = req.user.tipo === 'admin';
    const isParceiro = req.user.tipo === 'parceiro';
    const isConsultor = req.user.tipo === 'consultor';
    const isClinica = req.user.tipo === 'clinica';
    const empresaId = req.user.empresa_id;

    if (isClinica) {
      // Para clínica, buscar pacientes com agendamentos nesta clínica
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', req.user.clinica_id);

      if (agendError) throw agendError;

      const pacienteIds = agendamentos ? agendamentos.map(a => a.paciente_id).filter(id => id !== null) : [];
      
      if (pacienteIds.length > 0) {
        query = query.in('id', pacienteIds);
      } else {
        query = query.eq('id', 0); // Força resultado vazio
      }
    } else if (((isAdmin || isParceiro) && empresaId) || 
               (isConsultor && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && empresaId)) {
      // Para admin/parceiro/consultor interno, buscar pacientes da empresa (com empresa_id OU consultores da empresa)
      const { data: consultores, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id')
        .eq('empresa_id', empresaId);

      if (consultorError) throw consultorError;

      const consultorIds = consultores ? consultores.map(c => c.id) : [];
      
      // Criar condições: pacientes com empresa_id da empresa OU pacientes dos consultores da empresa
      const conditions = [];
      
      // Condição 1: Pacientes com empresa_id da empresa (leads diretos)
      conditions.push(`empresa_id.eq.${empresaId}`);
      
      // Condição 2: Pacientes dos consultores da empresa (se houver consultores)
      if (consultorIds.length > 0) {
        conditions.push(`consultor_id.in.(${consultorIds.join(',')})`);
      }
      
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      } else {
        query = query.eq('id', 0); // Força resultado vazio
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Buscar nomes dos consultores manualmente para evitar erro de múltiplas relações
    const consultorIds = [...new Set(data.map(p => p.consultor_id).filter(Boolean))];
    const consultoresNomes = {};
    
    if (consultorIds.length > 0) {
      const { data: consultores } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', consultorIds);
      
      if (consultores) {
        consultores.forEach(c => {
          consultoresNomes[c.id] = c.nome;
        });
      }
    }
    
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: consultoresNomes[paciente.consultor_id] || null,
      empreendimento_nome: paciente.empreendimentos?.nome,
      empreendimento_cidade: paciente.empreendimentos?.cidade,
      empreendimento_estado: paciente.empreendimentos?.estado
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/gerais/agendamentos - Dados gerais de agendamentos (para gráficos)
const getGeraisAgendamentos = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    // Aplicar filtros baseados no tipo de usuário
    const isAdmin = req.user.tipo === 'admin';
    const isParceiro = req.user.tipo === 'parceiro';
    const isConsultor = req.user.tipo === 'consultor';
    const isClinica = req.user.tipo === 'clinica';
    const empresaId = req.user.empresa_id;

    if (isClinica) {
      query = query.eq('clinica_id', req.user.clinica_id);
    } else if (((isAdmin || isParceiro) && empresaId) || 
               (isConsultor && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && empresaId)) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Buscar nomes dos consultores manualmente para evitar erro de múltiplas relações
    const consultorIds = [...new Set(data.map(a => a.consultor_id).filter(Boolean))];
    const consultoresNomes = {};
    
    if (consultorIds.length > 0) {
      const { data: consultores } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', consultorIds);
      
      if (consultores) {
        consultores.forEach(c => {
          consultoresNomes[c.id] = c.nome;
        });
      }
    }

    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: consultoresNomes[agendamento.consultor_id] || null,
      clinica_nome: agendamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/gerais/fechamentos - Dados gerais de fechamentos (para gráficos)
const getGeraisFechamentos = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, telefone, cpf),
        clinicas(nome)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Aplicar filtros baseados no tipo de usuário
    const isAdmin = req.user.tipo === 'admin';
    const isParceiro = req.user.tipo === 'parceiro';
    const isConsultor = req.user.tipo === 'consultor';
    const isClinica = req.user.tipo === 'clinica';
    const empresaId = req.user.empresa_id;

    if (isClinica) {
      // Para clínica, buscar fechamentos de pacientes com agendamentos nesta clínica
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', req.user.clinica_id);

      if (agendError) throw agendError;

      const pacienteIds = agendamentos ? agendamentos.map(a => a.paciente_id).filter(id => id !== null) : [];
      
      if (pacienteIds.length > 0) {
        query = query.in('paciente_id', pacienteIds);
      } else {
        query = query.eq('id', 0); // Força resultado vazio
      }
    } else if (((isAdmin || isParceiro) && empresaId) || 
               (isConsultor && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && empresaId)) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Buscar nomes dos consultores manualmente para evitar erro de múltiplas relações
    const consultorIds = [...new Set(data.map(f => f.consultor_id).filter(Boolean))];
    const consultoresNomes = {};
    
    if (consultorIds.length > 0) {
      const { data: consultores } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', consultorIds);
      
      if (consultores) {
        consultores.forEach(c => {
          consultoresNomes[c.id] = c.nome;
        });
      }
    }
    
    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(f => f.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(f => f.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(f => f.consultor_interno_id).filter(Boolean))];
    
    const allConsultoresIds = [...new Set([...consultoresIds, ...sdrIds, ...consultorInternoIds])];
    
    if (allConsultoresIds.length > 0) {
      const { data: consultoresData } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', allConsultoresIds);
      
      if (consultoresData) {
        consultoresData.forEach(c => {
          consultoresNomes[c.id] = c.nome;
        });
      }
    }

    const formattedData = data.map(fechamento => ({
      ...fechamento,
      paciente_nome: fechamento.pacientes?.nome,
      paciente_telefone: fechamento.pacientes?.telefone,
      paciente_cpf: fechamento.pacientes?.cpf,
      consultor_nome: consultoresNomes[fechamento.consultor_id] || null,
      sdr_nome: consultoresNomes[fechamento.sdr_id] || null,
      consultor_interno_nome: consultoresNomes[fechamento.consultor_interno_id] || null,
      clinica_nome: fechamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/gerais/clinicas - Dados gerais de clínicas (para gráficos)
const getGeraisClinicas = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('clinicas')
      .select('*')
      .order('created_at', { ascending: false });

    // Aplicar filtros baseados no tipo de usuário
    const isAdmin = req.user.tipo === 'admin';
    const isParceiro = req.user.tipo === 'parceiro';
    const isConsultor = req.user.tipo === 'consultor';
    const empresaId = req.user.empresa_id;

    if ((isAdmin || isParceiro || isConsultor) && empresaId) {
      // Para admin/parceiro/consultor, buscar clínicas da empresa
      query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/ranking/sdrs - Ranking de SDRs por agendamentos
const getRankingSDRs = async (req, res) => {
  try {
    const empresaId = req.user.empresa_id;
    
    // Buscar SDRs (tipo_consultor = 'sdr' AND empresa_id = 5)
    const { data: sdrs, error: sdrsError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, foto_url, musica_url, tipo_consultor')
      .eq('tipo_consultor', 'sdr')
      .eq('empresa_id', 5)
      .eq('ativo', true);

    if (sdrsError) throw sdrsError;

    // Buscar agendamentos para calcular totais por SDR
    const { data: agendamentos, error: agendError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, sdr_id, data_agendamento')
      .eq('empresa_id', empresaId);

    if (agendError) throw agendError;

    // Calcular totais por SDR
    const sdrStats = sdrs.map(sdr => {
      const agendamentosSDR = agendamentos.filter(a => a.sdr_id === sdr.id);
      
      // Agendamentos do mês atual
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const agendamentosMes = agendamentosSDR.filter(a => {
        // Verificar se tem data válida
        if (!a.data_agendamento) return false;
        // Corrigir problema de timezone: interpretar data como local
        const [ano, mes, dia] = a.data_agendamento.split('-');
        const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
      });

      return {
        id: sdr.id,
        nome: sdr.nome,
        foto_url: sdr.foto_url,
        musica_url: sdr.musica_url,
        total_agendamentos: agendamentosSDR.length,
        mes_atual: agendamentosMes.length,
        total_geral: agendamentosSDR.length
      };
    });

    // Ordenar por maior número de agendamentos do mês atual
    sdrStats.sort((a, b) => b.mes_atual - a.mes_atual);

    res.json(sdrStats);
  } catch (error) {
    console.error('Erro ao buscar ranking de SDRs:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/ranking/internos - Ranking de consultores internos por fechamentos
const getRankingInternos = async (req, res) => {
  try {
    const empresaId = req.user.empresa_id;
    
    // Buscar consultores internos (pode_ver_todas_novas_clinicas=true AND podealterarstatus=true AND tipo_consultor != 'sdr')
    const { data: internos, error: internosError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, foto_url, musica_url, tipo_consultor')
      .eq('pode_ver_todas_novas_clinicas', true)
      .eq('podealterarstatus', true)
      .neq('tipo_consultor', 'sdr')
      .eq('empresa_id', 5)
      .eq('ativo', true);

    if (internosError) throw internosError;

    // Buscar fechamentos
    const { data: fechamentos, error: fechError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, consultor_interno_id, valor_fechado, data_fechamento')
      .eq('aprovado', 'aprovado')
      .eq('empresa_id', empresaId);

    if (fechError) throw fechError;

    // Calcular totais por consultor interno
    const internoStats = internos.map(interno => {
      const fechamentosInterno = fechamentos.filter(f => f.consultor_interno_id === interno.id);
      
      // Fechamentos do mês atual
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const fechamentosMes = fechamentosInterno.filter(f => {
        // Verificar se tem data válida
        if (!f.data_fechamento) return false;
        // Corrigir problema de timezone: interpretar data como local
        const [ano, mes, dia] = f.data_fechamento.split('-');
        const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
      });

      const valorTotalGeral = fechamentosInterno.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);
      const valorTotalMes = fechamentosMes.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);

      return {
        id: interno.id,
        nome: interno.nome,
        foto_url: interno.foto_url,
        musica_url: interno.musica_url,
        total_fechamentos: fechamentosInterno.length,
        valor_fechado: valorTotalGeral,
        mes_atual: fechamentosMes.length,
        valor_mes: valorTotalMes
      };
    });

    // Ordenar por: 1) Maior valor fechado do mês, 2) Maior quantidade do mês
    internoStats.sort((a, b) => {
      if (b.valor_mes !== a.valor_mes) return b.valor_mes - a.valor_mes;
      return b.mes_atual - a.mes_atual;
    });

    res.json(internoStats);
  } catch (error) {
    console.error('Erro ao buscar ranking de internos:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/ranking/freelancers - Ranking de freelancers por comissões
const getRankingFreelancers = async (req, res) => {
  try {
    const empresaId = req.user.empresa_id;
    
    // Buscar freelancers
    const { data: freelancers, error: freelancersError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, tipo_consultor')
      .eq('is_freelancer', true)
      .eq('empresa_id', 5)
      .eq('ativo', true);

    if (freelancersError) throw freelancersError;

    // Buscar fechamentos aprovados
    const { data: fechamentos, error: fechError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, consultor_id, valor_fechado, data_fechamento')
      .eq('aprovado', 'aprovado')
      .eq('empresa_id', empresaId);

    if (fechError) throw fechError;

    // Taxa de comissão fixa (exemplo: 10% - ajustar conforme necessário)
    const TAXA_COMISSAO = 0.10;

    // Calcular estatísticas por freelancer
    const freelancerStats = freelancers.map(freelancer => {
      const fechamentosFreelancer = fechamentos.filter(f => f.consultor_id === freelancer.id);
      
      // Fechamentos do mês atual
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const fechamentosMes = fechamentosFreelancer.filter(f => {
        // Verificar se tem data válida
        if (!f.data_fechamento) return false;
        // Corrigir problema de timezone: interpretar data como local
        const [ano, mes, dia] = f.data_fechamento.split('-');
        const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
      });

      // Calcular comissões
      const totalComissoes = fechamentosFreelancer.reduce((acc, f) => {
        const valorFechado = parseFloat(f.valor_fechado || 0);
        return acc + (valorFechado * TAXA_COMISSAO);
      }, 0);

      const comissoesMes = fechamentosMes.reduce((acc, f) => {
        const valorFechado = parseFloat(f.valor_fechado || 0);
        return acc + (valorFechado * TAXA_COMISSAO);
      }, 0);

      return {
        id: freelancer.id,
        nome: freelancer.nome,
        total_comissoes: totalComissoes,
        comissoes_mes: comissoesMes,
        total_indicacoes: fechamentosFreelancer.length,
        fechamentos_convertidos: fechamentosFreelancer.length,
        indicacoes_mes: fechamentosMes.length
      };
    });

    // Ordenar por maior valor de comissões do mês atual
    freelancerStats.sort((a, b) => b.comissoes_mes - a.comissoes_mes);

    res.json(freelancerStats);
  } catch (error) {
    console.error('Erro ao buscar ranking de freelancers:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/incorporadora/corretor - KPIs do primeiro quadro (foco corretor)
const getDashboardIncorporadoraCorretor = async (req, res) => {
  try {
    const consultorId = req.user.id;
    const empresaId = req.user.empresa_id;
    
    // Verificar se é incorporadora (empresa_id = 5)
    if (empresaId !== 5) {
      return res.status(403).json({ error: 'Acesso negado. Apenas para incorporadora.' });
    }
    
    // Verificar se é corretor (consultor interno)
    const isConsultorInterno = req.user.tipo === 'consultor' && 
      req.user.pode_ver_todas_novas_clinicas === true && 
      req.user.podealterarstatus === true;
    
    if (!isConsultorInterno) {
      return res.status(403).json({ error: 'Acesso negado. Apenas para corretores internos.' });
    }
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    // Buscar meta do corretor
    const { data: meta, error: metaError } = await supabaseAdmin
      .from('metas_corretores')
      .select('meta_vgv, meta_entrada')
      .eq('corretor_id', consultorId)
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)
      .single();
    
    // Se não tiver meta, usar valores padrão
    const metaVGV = meta ? parseFloat(meta.meta_vgv || 0) : 1020000.00;
    const metaEntrada = meta ? parseFloat(meta.meta_entrada || 0) : 150000.00;
    
    // Buscar fechamentos do corretor no mês
    const { data: fechamentos, error: fechError } = await supabaseAdmin
      .from('fechamentos')
      .select('valor_fechado, entrada_paga, data_fechamento')
      .eq('consultor_interno_id', consultorId)
      .eq('aprovado', 'aprovado')
      .eq('empresa_id', 5);
    
    if (fechError) throw fechError;
    
    // Filtrar fechamentos do mês atual
    const fechamentosMes = fechamentos?.filter(f => {
      if (!f.data_fechamento) return false;
      const [ano, mes, dia] = f.data_fechamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // Calcular VGV ganho total
    const vgvGanhoTotal = fechamentosMes.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);
    
    // Calcular entrada ganha atualmente
    const entradaGanhaAtualmente = fechamentosMes.reduce((acc, f) => acc + parseFloat(f.entrada_paga || 0), 0);
    
    // Calcular ticket médio
    const ticketMedio = fechamentosMes.length > 0 ? (vgvGanhoTotal / fechamentosMes.length) : 0;
    
    // Buscar leads que entraram no mês (pacientes criados no mês)
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('pacientes')
      .select('id, created_at')
      .eq('empresa_id', 5);
    
    if (leadsError) throw leadsError;
    
    // Filtrar leads do mês atual
    const leadsMes = leads?.filter(l => {
      if (!l.created_at) return false;
      const data = new Date(l.created_at);
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // Calcular taxa de conversão
    const taxaConversao = leadsMes.length > 0 ? ((fechamentosMes.length / leadsMes.length) * 100) : 0;
    
    res.json({
      vgv_ganho_total: vgvGanhoTotal,
      taxa_conversao: taxaConversao,
      ticket_medio: ticketMedio,
      entrada_ganha_atualmente: entradaGanhaAtualmente,
      meta_maxima_entrada: metaEntrada,
      numero_fechamentos: fechamentosMes.length,
      numero_leads: leadsMes.length
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard incorporadora corretor:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/incorporadora/geral - Dados gerais (negócios ganhos/perdidos/em andamento)
const getDashboardIncorporadoraGeral = async (req, res) => {
  try {
    const empresaId = req.user.empresa_id;
    
    // Verificar se é incorporadora (empresa_id = 5)
    if (empresaId !== 5) {
      return res.status(403).json({ error: 'Acesso negado. Apenas para incorporadora.' });
    }
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    // Status negativos
    const STATUS_NEGATIVOS = ['nao_existe', 'nao_tem_interesse', 'nao_reconhece', 'nao_responde', 'sem_clinica', 'nao_passou_cpf', 'nao_tem_outro_cpf', 'cpf_reprovado'];
    
    // Buscar fechamentos aprovados do mês (negócios ganhos) - Apenas empresa_id = 5
    const { data: fechamentos, error: fechError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, data_fechamento, aprovado')
      .eq('empresa_id', 5)
      .eq('aprovado', 'aprovado');
    
    if (fechError) throw fechError;
    
    const fechamentosMes = fechamentos?.filter(f => {
      if (!f.data_fechamento) return false;
      const [ano, mes, dia] = f.data_fechamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // Buscar pacientes com status negativos do mês (negócios perdidos) - Apenas empresa_id = 5
    // Como não temos updated_at, vamos usar uma abordagem alternativa:
    // Contar pacientes com status negativo que foram criados no mês OU que têm agendamentos criados no mês
    const { data: pacientesNegativos, error: pacientesError } = await supabaseAdmin
      .from('pacientes')
      .select('id, status, created_at')
      .eq('empresa_id', 5)
      .in('status', STATUS_NEGATIVOS);
    
    if (pacientesError) throw pacientesError;
    
    // Buscar agendamentos criados no mês para pacientes negativos
    const pacientesNegativosIds = pacientesNegativos?.map(p => p.id) || [];
    let agendamentosNegativos = [];
    
    if (pacientesNegativosIds.length > 0) {
      const { data: agendamentosNegativosData, error: agendNegError } = await supabaseAdmin
        .from('agendamentos')
        .select('id, paciente_id, created_at')
        .eq('empresa_id', 5)
        .in('paciente_id', pacientesNegativosIds);
      
      if (agendNegError) throw agendNegError;
      agendamentosNegativos = agendamentosNegativosData || [];
    }
    
    // Filtrar pacientes negativos criados no mês OU que têm agendamentos criados no mês
    const pacientesNegativosMes = pacientesNegativos?.filter(p => {
      // Paciente criado no mês
      if (p.created_at) {
        const data = new Date(p.created_at);
        if (data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual) {
          return true;
        }
      }
      
      // OU tem agendamento criado no mês
      const temAgendamentoMes = agendamentosNegativos?.some(a => {
        if (a.paciente_id === p.id && a.created_at) {
          const dataAgendamento = new Date(a.created_at);
          return dataAgendamento.getMonth() + 1 === mesAtual && dataAgendamento.getFullYear() === anoAtual;
        }
        return false;
      });
      
      return temAgendamentoMes;
    }) || [];
    
    // Buscar pacientes em andamento (status da Foto 2: 'em_conversa', 'cpf_aprovado', 'agendado') - Apenas empresa_id = 5
    // Não filtrar por mês - são dados atuais
    const { data: pacientesAndamento, error: andamentoError } = await supabaseAdmin
      .from('pacientes')
      .select('id, status')
      .eq('empresa_id', 5)
      .in('status', ['em_conversa', 'cpf_aprovado', 'agendado']); // Status da Foto 2 (tabela pacientes)
    
    if (andamentoError) throw andamentoError;
    
    // Buscar agendamentos com status 'agendado' ou 'compareceu' - Apenas empresa_id = 5
    const { data: agendamentos, error: agendError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, status, paciente_id')
      .eq('empresa_id', 5)
      .in('status', ['agendado', 'compareceu']);
    
    if (agendError) throw agendError;
    
    // Combinar pacientes em andamento com pacientes que têm agendamentos em andamento
    const pacientesIdsAndamento = new Set();
    pacientesAndamento?.forEach(p => pacientesIdsAndamento.add(p.id));
    agendamentos?.forEach(a => {
      if (a.paciente_id) pacientesIdsAndamento.add(a.paciente_id);
    });
    
    const emAndamento = pacientesIdsAndamento.size;
    
    const responseData = {
      negocios_ganhos_mes: fechamentosMes.length,
      negocios_perdidos_mes: pacientesNegativosMes.length,
      em_andamento: emAndamento
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Erro ao buscar dashboard incorporadora geral:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/incorporadora/funil - Dados do funil visual
const getDashboardIncorporadoraFunil = async (req, res) => {
  try {
    const empresaId = req.user.empresa_id;
    
    // Verificar se é incorporadora (empresa_id = 5)
    if (empresaId !== 5) {
      return res.status(403).json({ error: 'Acesso negado. Apenas para incorporadora.' });
    }
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    // NOVA LÓGICA: Leads do mês = Leads criados no mês + Leads antigos que agendaram + Leads antigos que fecharam
    
    // 1. Buscar agendamentos do mês primeiro (para identificar leads antigos que agendaram)
    const { data: agendamentos, error: agendamentosError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, paciente_id, data_agendamento')
      .eq('empresa_id', 5);
    
    if (agendamentosError) throw agendamentosError;
    
    const agendamentosMes = agendamentos?.filter(a => {
      if (!a.data_agendamento) return false;
      const [ano, mes, dia] = a.data_agendamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // 2. Buscar fechamentos do mês (para identificar leads antigos que fecharam)
    const { data: fechamentos, error: fechError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, paciente_id, data_fechamento')
      .eq('empresa_id', 5)
      .eq('aprovado', 'aprovado');
    
    if (fechError) throw fechError;
    
    const fechamentosMes = fechamentos?.filter(f => {
      if (!f.data_fechamento) return false;
      const [ano, mes, dia] = f.data_fechamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // 3. Identificar IDs de pacientes que agendaram ou fecharam no mês (podem ser antigos)
    const pacientesIdsComAgendamentoMes = new Set(
      agendamentosMes.map(a => a.paciente_id).filter(Boolean)
    );
    const pacientesIdsComFechamentoMes = new Set(
      fechamentosMes.map(f => f.paciente_id).filter(Boolean)
    );
    
    // 4. Buscar todos os pacientes (empresa_id = 5)
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('pacientes')
      .select('id, status, created_at, sdr_id, consultor_id')
      .eq('empresa_id', 5);
    
    if (leadsError) throw leadsError;
    
    // 5. Filtrar pacientes criados no mês
    const todosPacientesMes = leads?.filter(l => {
      if (!l.created_at) return false;
      const data = new Date(l.created_at);
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // 6. Combinar: Leads criados no mês + Leads antigos que agendaram + Leads antigos que fecharam
    const todosLeadsIds = new Set();
    
    // Adicionar leads criados no mês
    todosPacientesMes.forEach(p => todosLeadsIds.add(p.id));
    
    // Adicionar leads antigos que agendaram no mês
    pacientesIdsComAgendamentoMes.forEach(id => todosLeadsIds.add(id));
    
    // Adicionar leads antigos que fecharam no mês
    pacientesIdsComFechamentoMes.forEach(id => todosLeadsIds.add(id));
    
    const leadsMes = todosLeadsIds.size;
    
    
    // 3. Comparecimento: agendamentos com status = 'compareceu' no mês - Apenas empresa_id = 5
    const { data: comparecimentos, error: compError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, status, data_agendamento')
      .eq('empresa_id', 5)
      .eq('status', 'compareceu');
    
    if (compError) throw compError;
    
    const comparecimentosMes = comparecimentos?.filter(c => {
      if (!c.data_agendamento) return false;
      const [ano, mes, dia] = c.data_agendamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // 4. Fechamento: já foi buscado acima (linha 1059), apenas usar fechamentosMes
    
    // 5. Em Andamento: pacientes com status da Foto 2 ('em_conversa', 'cpf_aprovado', 'agendado') 
    //    mas APENAS dos leads que estão no escopo mensal (novos + antigos reativados)
    const { data: pacientesAndamento, error: andamentoError } = await supabaseAdmin
      .from('pacientes')
      .select('id, status')
      .eq('empresa_id', 5)
      .in('status', ['em_conversa', 'cpf_aprovado', 'agendado']); // Status da Foto 2 (tabela pacientes)
    
    if (andamentoError) throw andamentoError;
    
    // Buscar agendamentos com status 'agendado' ou 'compareceu' - Apenas empresa_id = 5
    const { data: agendamentosAndamento, error: agendAndamentoError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, status, paciente_id')
      .eq('empresa_id', 5)
      .in('status', ['agendado', 'compareceu']);
    
    if (agendAndamentoError) throw agendAndamentoError;
    
    // Combinar pacientes em andamento com pacientes que têm agendamentos em andamento
    const pacientesIdsAndamento = new Set();
    pacientesAndamento?.forEach(p => pacientesIdsAndamento.add(p.id));
    agendamentosAndamento?.forEach(a => {
      if (a.paciente_id) pacientesIdsAndamento.add(a.paciente_id);
    });
    
    // Filtrar Em Andamento apenas dos leads que estão no escopo mensal
    const pacientesEmAndamentoNoEscopo = Array.from(pacientesIdsAndamento).filter(id => 
      todosLeadsIds.has(id)
    );
    const emAndamento = pacientesEmAndamentoNoEscopo.length;
    
    // 6. Pagamento entrada: fechamentos com entrada_paga > 0 no mês - Apenas empresa_id = 5
    const { data: fechamentosComEntrada, error: entradaError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, entrada_paga, data_fechamento')
      .eq('empresa_id', 5)
      .eq('aprovado', 'aprovado')
      .gt('entrada_paga', 0);
    
    if (entradaError) throw entradaError;
    
    const pagamentosEntradaMes = fechamentosComEntrada?.filter(f => {
      if (!f.data_fechamento) return false;
      const [ano, mes, dia] = f.data_fechamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // Calcular percentuais de conversão
    const taxaLeadsParaAgendamento = leadsMes > 0 ? ((agendamentosMes.length / leadsMes) * 100) : 0;
    const taxaAgendamentoParaComparecimento = agendamentosMes.length > 0 ? ((comparecimentosMes.length / agendamentosMes.length) * 100) : 0;
    const taxaComparecimentoParaFechamento = comparecimentosMes.length > 0 ? ((fechamentosMes.length / comparecimentosMes.length) * 100) : 0;
    const taxaFechamentoParaPagamento = fechamentosMes.length > 0 ? ((pagamentosEntradaMes.length / fechamentosMes.length) * 100) : 0;
    
    // Taxa de conversão geral: Fechamentos / Leads (corrigida)
    const taxaConversaoGeral = leadsMes > 0 ? ((fechamentosMes.length / leadsMes) * 100) : 0;
    
    const responseData = {
      leads_entram: leadsMes,
      em_andamento: emAndamento,
      agendamento: agendamentosMes.length,
      comparecimento: comparecimentosMes.length,
      fechamento: fechamentosMes.length,
      pagamento_entrada: pagamentosEntradaMes.length,
      taxas: {
        leads_para_agendamento: taxaLeadsParaAgendamento,
        agendamento_para_comparecimento: taxaAgendamentoParaComparecimento,
        comparecimento_para_fechamento: taxaComparecimentoParaFechamento,
        fechamento_para_pagamento: taxaFechamentoParaPagamento
      }
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Erro ao buscar dashboard incorporadora funil:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/incorporadora/corretores/individuais - Dados de VGV e Entrada por corretor com metas
const getDashboardIncorporadoraCorretoresIndividuais = async (req, res) => {
  try {
    const empresaId = req.user.empresa_id;
    
    // Verificar se é incorporadora (empresa_id = 5)
    if (empresaId !== 5) {
      return res.status(403).json({ error: 'Acesso negado. Apenas para incorporadora.' });
    }
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    // Buscar corretores (empresa_id = 5, is_freelancer = false, tipo_consultor = 'corretor')
    const { data: corretores, error: corretoresError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, foto_url, empresa_id')
      .eq('empresa_id', 5)
      .eq('is_freelancer', false)
      .eq('tipo_consultor', 'corretor')
      .eq('ativo', true);
    
    if (corretoresError) throw corretoresError;
    
    // Buscar fechamentos do mês
    const { data: fechamentos, error: fechError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, consultor_interno_id, valor_fechado, entrada_paga, data_fechamento')
      .eq('empresa_id', 5)
      .eq('aprovado', 'aprovado');
    
    if (fechError) throw fechError;
    
    // Filtrar fechamentos do mês atual
    const fechamentosMes = fechamentos?.filter(f => {
      if (!f.data_fechamento) return false;
      const [ano, mes, dia] = f.data_fechamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // Buscar metas dos corretores
    const { data: metas, error: metasError } = await supabaseAdmin
      .from('metas_corretores')
      .select('corretor_id, meta_vgv, meta_entrada')
      .eq('mes', mesAtual)
      .eq('ano', anoAtual);
    
    if (metasError) throw metasError;
    
    // Calcular dados por corretor
    const dadosCorretores = corretores.map(corretor => {
      const fechamentosCorretor = fechamentosMes.filter(f => f.consultor_interno_id === corretor.id);
      
      const vgvAtual = fechamentosCorretor.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);
      const entradaAtual = fechamentosCorretor.reduce((acc, f) => acc + parseFloat(f.entrada_paga || 0), 0);
      
      // Buscar meta do corretor ou usar valores padrão
      const meta = metas?.find(m => m.corretor_id === corretor.id);
      const metaVGV = meta ? parseFloat(meta.meta_vgv || 0) : 1020000.00;
      const metaEntrada = meta ? parseFloat(meta.meta_entrada || 0) : 150000.00;
      
      return {
        corretor_id: corretor.id,
        nome: corretor.nome,
        foto_url: corretor.foto_url,
        vgv_atual: vgvAtual,
        entrada_atual: entradaAtual,
        meta_vgv: metaVGV,
        meta_entrada: metaEntrada
      };
    });
    
    res.json(dadosCorretores);
  } catch (error) {
    console.error('Erro ao buscar dados de corretores individuais:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/incorporadora/sdr/:sdr_id/funil - Mini-funil individual de um SDR
const getDashboardIncorporadoraSDRFunil = async (req, res) => {
  try {
    const empresaId = req.user.empresa_id;
    const { sdr_id } = req.params;
    
    // Verificar se é incorporadora (empresa_id = 5)
    if (empresaId !== 5) {
      return res.status(403).json({ error: 'Acesso negado. Apenas para incorporadora.' });
    }
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    // NOVA LÓGICA: Leads do mês = Leads criados no mês + Leads antigos que agendaram + Leads antigos que fecharam
    
    // 1. Buscar agendamentos do mês primeiro (para identificar leads antigos que agendaram)
    const { data: agendamentos, error: agendamentosError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, paciente_id, data_agendamento, sdr_id')
      .eq('empresa_id', 5)
      .eq('sdr_id', sdr_id);
    
    if (agendamentosError) throw agendamentosError;
    
    const agendamentosMes = agendamentos?.filter(a => {
      if (!a.data_agendamento) return false;
      const [ano, mes, dia] = a.data_agendamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // 2. Buscar fechamentos do mês (para identificar leads antigos que fecharam)
    const { data: fechamentos, error: fechError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, paciente_id, data_fechamento, sdr_id')
      .eq('empresa_id', 5)
      .eq('aprovado', 'aprovado')
      .eq('sdr_id', sdr_id);
    
    if (fechError) throw fechError;
    
    const fechamentosMes = fechamentos?.filter(f => {
      if (!f.data_fechamento) return false;
      const [ano, mes, dia] = f.data_fechamento.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // 3. Identificar IDs de pacientes que agendaram ou fecharam no mês (podem ser antigos)
    const pacientesIdsComAgendamentoMes = new Set(
      agendamentosMes.map(a => a.paciente_id).filter(Boolean)
    );
    const pacientesIdsComFechamentoMes = new Set(
      fechamentosMes.map(f => f.paciente_id).filter(Boolean)
    );
    
    // 4. Buscar pacientes vinculados ao SDR
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('pacientes')
      .select('id, status, created_at, sdr_id')
      .eq('empresa_id', 5)
      .eq('sdr_id', sdr_id);
    
    if (leadsError) throw leadsError;
    
    // 5. Filtrar pacientes criados no mês
    const todosPacientesMes = leads?.filter(l => {
      if (!l.created_at) return false;
      const data = new Date(l.created_at);
      return data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
    }) || [];
    
    // 6. Combinar: Leads criados no mês + Leads antigos que agendaram + Leads antigos que fecharam
    const todosLeadsIds = new Set();
    
    // Adicionar leads criados no mês
    todosPacientesMes.forEach(p => todosLeadsIds.add(p.id));
    
    // Adicionar leads antigos que agendaram no mês
    pacientesIdsComAgendamentoMes.forEach(id => todosLeadsIds.add(id));
    
    // Adicionar leads antigos que fecharam no mês
    pacientesIdsComFechamentoMes.forEach(id => todosLeadsIds.add(id));
    
    const leadsMes = todosLeadsIds.size;
    
    // 7. Em Andamento: pacientes com status da Foto 2 ('em_conversa', 'cpf_aprovado', 'agendado') vinculados ao SDR
    const { data: pacientesAndamento, error: andamentoError } = await supabaseAdmin
      .from('pacientes')
      .select('id, status, sdr_id')
      .eq('empresa_id', 5)
      .eq('sdr_id', sdr_id)
      .in('status', ['em_conversa', 'cpf_aprovado', 'agendado']); // Status da Foto 2 (tabela pacientes)
    
    if (andamentoError) throw andamentoError;
    
    // Buscar agendamentos com status 'agendado' ou 'compareceu' vinculados ao SDR
    const { data: agendamentosAndamento, error: agendAndamentoError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, status, paciente_id, sdr_id')
      .eq('empresa_id', 5)
      .eq('sdr_id', sdr_id)
      .in('status', ['agendado', 'compareceu']);
    
    if (agendAndamentoError) throw agendAndamentoError;
    
    // Combinar pacientes em andamento com pacientes que têm agendamentos em andamento
    const pacientesIdsAndamento = new Set();
    pacientesAndamento?.forEach(p => pacientesIdsAndamento.add(p.id));
    agendamentosAndamento?.forEach(a => {
      if (a.paciente_id) pacientesIdsAndamento.add(a.paciente_id);
    });
    
    // 8. Filtrar Em Andamento apenas dos leads que estão no escopo mensal
    const pacientesEmAndamentoNoEscopo = Array.from(pacientesIdsAndamento).filter(id => 
      todosLeadsIds.has(id)
    );
    const emAndamento = pacientesEmAndamentoNoEscopo.length;
    
    // Calcular taxas de conversão
    const taxaLeadsParaAndamento = leadsMes > 0 ? ((emAndamento / leadsMes) * 100) : 0;
    const taxaAndamentoParaAgendamento = emAndamento > 0 ? ((agendamentosMes.length / emAndamento) * 100) : 0;
    const taxaAgendamentoParaFechamento = agendamentosMes.length > 0 ? ((fechamentosMes.length / agendamentosMes.length) * 100) : 0;
    
    res.json({
      leads: leadsMes,
      em_andamento: emAndamento,
      agendamento: agendamentosMes.length,
      fechamento: fechamentosMes.length,
      taxas: {
        leads_para_andamento: taxaLeadsParaAndamento,
        andamento_para_agendamento: taxaAndamentoParaAgendamento,
        agendamento_para_fechamento: taxaAgendamentoParaFechamento
      }
    });
  } catch (error) {
    console.error('Erro ao buscar mini-funil do SDR:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDashboard,
  getGeraisPacientes,
  getGeraisAgendamentos,
  getGeraisFechamentos,
  getGeraisClinicas,
  getRankingSDRs,
  getRankingInternos,
  getRankingFreelancers,
  getDashboardIncorporadoraCorretor,
  getDashboardIncorporadoraGeral,
  getDashboardIncorporadoraFunil,
  getDashboardIncorporadoraSDRFunil,
  getDashboardIncorporadoraCorretoresIndividuais
};

