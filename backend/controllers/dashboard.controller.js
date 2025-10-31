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

module.exports = {
  getDashboard,
  getGeraisPacientes,
  getGeraisAgendamentos,
  getGeraisFechamentos,
  getGeraisClinicas,
  getRankingSDRs,
  getRankingInternos,
  getRankingFreelancers
};

