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
    } else if (isConsultor) {
      agendamentosQuery = agendamentosQuery.eq('consultor_id', consultorId);
    } else if ((isAdmin || isParceiro) && empresaId) {
      // Para admin ou parceiro, filtrar agendamentos de consultores da empresa
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
    } else if (isConsultor) {
      lembradosQuery = lembradosQuery.eq('consultor_id', consultorId);
    } else if ((isAdmin || isParceiro) && empresaId) {
      // Para admin ou parceiro, filtrar lembrados de consultores da empresa
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
        consultores(nome),
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
    } else if ((isAdmin || isParceiro) && empresaId) {
      // Para admin/parceiro, buscar pacientes da empresa (com empresa_id OU consultores da empresa)
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
    } else if (isConsultor) {
      // Para consultor, buscar pacientes com agendamentos OU fechamentos dele
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.id);

      if (agendError) throw agendError;

      const { data: fechamentos, error: fechError } = await supabaseAdmin
        .from('fechamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.id);

      if (fechError) throw fechError;

      const pacienteIdsAgendamentos = agendamentos ? agendamentos.map(a => a.paciente_id) : [];
      const pacienteIdsFechamentos = fechamentos ? fechamentos.map(f => f.paciente_id) : [];
      
      const todosPacienteIds = [...new Set([...pacienteIdsAgendamentos, ...pacienteIdsFechamentos])];
      
      if (todosPacienteIds.length > 0) {
        query = query.in('id', todosPacienteIds);
      } else {
        query = query.eq('id', 0); // Força resultado vazio
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome,
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
        consultores(nome),
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
    } else if (isConsultor) {
      query = query.eq('consultor_id', req.user.id);
    } else if ((isAdmin || isParceiro) && empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: agendamento.consultores?.nome,
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
        consultores(nome),
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
    } else if (isConsultor) {
      query = query.eq('consultor_id', req.user.id);
    } else if ((isAdmin || isParceiro) && empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formattedData = data.map(fechamento => ({
      ...fechamento,
      paciente_nome: fechamento.pacientes?.nome,
      paciente_telefone: fechamento.pacientes?.telefone,
      paciente_cpf: fechamento.pacientes?.cpf,
      consultor_nome: fechamento.consultores?.nome,
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

    if (isConsultor) {
      // Para consultor, buscar apenas clínicas criadas por ele
      query = query.eq('criado_por_consultor_id', req.user.id);
    } else if ((isAdmin || isParceiro) && empresaId) {
      // Para admin/parceiro, buscar apenas clínicas da empresa
      query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDashboard,
  getGeraisPacientes,
  getGeraisAgendamentos,
  getGeraisFechamentos,
  getGeraisClinicas
};

