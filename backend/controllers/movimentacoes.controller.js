const { supabase, supabaseAdmin } = require('../config/database');

// Função auxiliar para registrar movimentação
const registrarMovimentacao = async (dados) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('movimentacoes')
      .insert([dados])
      .select();
    
    if (error) {
      console.error('❌ Erro ao registrar movimentação:', error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('❌ Erro ao registrar movimentação:', error);
    throw error;
  }
};

// GET /api/movimentacoes/usuario/:consultorId - Ver todas movimentações de um consultor específico
const getMovimentacoesUsuario = async (req, res) => {
  try {
    const { consultorId } = req.params;
    const { tipo, data_inicio, data_fim, limit = 50, offset = 0 } = req.query;
    
    let query = supabaseAdmin
      .from('movimentacoes')
      .select(`
        *,
        consultores!movimentacoes_consultor_id_fkey(nome),
        sdr:consultores!movimentacoes_sdr_id_fkey(nome),
        consultor_interno:consultores!movimentacoes_consultor_interno_id_fkey(nome)
      `)
      .or(`consultor_id.eq.${consultorId},sdr_id.eq.${consultorId},consultor_interno_id.eq.${consultorId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Aplicar filtros
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    
    if (data_inicio) {
      query = query.gte('created_at', data_inicio);
    }
    
    if (data_fim) {
      query = query.lte('created_at', data_fim);
    }
    
    // Filtrar por empresa se necessário
    if (req.user.tipo === 'admin' || req.user.tipo === 'parceiro') {
      if (req.user.empresa_id) {
        query = query.eq('empresa_id', req.user.empresa_id);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      movimentacoes: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    console.error('❌ Erro ao buscar movimentações do usuário:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/movimentacoes/paciente/:pacienteId - Ver histórico completo de um paciente
const getMovimentacoesPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('movimentacoes')
      .select(`
        *,
        consultores!movimentacoes_consultor_id_fkey(nome),
        sdr:consultores!movimentacoes_sdr_id_fkey(nome),
        consultor_interno:consultores!movimentacoes_consultor_interno_id_fkey(nome)
      `)
      .or(`registro_tipo.eq.paciente,registro_tipo.eq.agendamento,registro_tipo.eq.fechamento`)
      .or(`registro_id.eq.${pacienteId}`)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.json({
      movimentacoes: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    console.error('❌ Erro ao buscar movimentações do paciente:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/movimentacoes/relatorio - Relatório geral com filtros
const getRelatorioMovimentacoes = async (req, res) => {
  try {
    const { 
      tipo, 
      data_inicio, 
      data_fim, 
      consultor_id, 
      empresa_id,
      limit = 100, 
      offset = 0 
    } = req.query;
    
    let query = supabaseAdmin
      .from('movimentacoes')
      .select(`
        *,
        consultores!movimentacoes_consultor_id_fkey(nome),
        sdr:consultores!movimentacoes_sdr_id_fkey(nome),
        consultor_interno:consultores!movimentacoes_consultor_interno_id_fkey(nome)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Aplicar filtros
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    
    if (data_inicio) {
      query = query.gte('created_at', data_inicio);
    }
    
    if (data_fim) {
      query = query.lte('created_at', data_fim);
    }
    
    if (consultor_id) {
      query = query.or(`consultor_id.eq.${consultor_id},sdr_id.eq.${consultor_id},consultor_interno_id.eq.${consultor_id}`);
    }
    
    if (empresa_id) {
      query = query.eq('empresa_id', empresa_id);
    }
    
    // Filtrar por empresa do usuário se necessário
    if (req.user.tipo === 'admin' || req.user.tipo === 'parceiro') {
      if (req.user.empresa_id && !empresa_id) {
        query = query.eq('empresa_id', req.user.empresa_id);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      movimentacoes: data || [],
      total: data?.length || 0,
      filtros: {
        tipo,
        data_inicio,
        data_fim,
        consultor_id,
        empresa_id
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar relatório de movimentações:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/movimentacoes/recentes - Movimentações recentes para dashboard
const getMovimentacoesRecentes = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    let query = supabaseAdmin
      .from('movimentacoes')
      .select(`
        *,
        consultores!movimentacoes_consultor_id_fkey(nome),
        sdr:consultores!movimentacoes_sdr_id_fkey(nome),
        consultor_interno:consultores!movimentacoes_consultor_interno_id_fkey(nome)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    // Filtrar por empresa do usuário se necessário
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      movimentacoes: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    console.error('❌ Erro ao buscar movimentações recentes:', error);
    res.status(500).json({ error: error.message });
  }
};

// Função auxiliar para criar movimentação de lead atribuído
const criarMovimentacaoLeadAtribuido = async (pacienteId, sdrId, executadoPor) => {
  return await registrarMovimentacao({
    tipo: 'lead_atribuido',
    registro_tipo: 'paciente',
    registro_id: pacienteId,
    sdr_id: sdrId,
    executado_por_id: null, // Não referenciar usuarios, apenas armazenar nome e tipo
    executado_por_nome: executadoPor.nome || executadoPor.username,
    executado_por_tipo: executadoPor.tipo,
    acao_descricao: `Lead atribuído ao SDR ${executadoPor.nome || executadoPor.username}`,
    empresa_id: executadoPor.empresa_id
  });
};

// Função auxiliar para criar movimentação de agendamento criado
const criarMovimentacaoAgendamentoCriado = async (agendamentoId, dados) => {
  return await registrarMovimentacao({
    tipo: 'agendamento_criado',
    registro_tipo: 'agendamento',
    registro_id: agendamentoId,
    consultor_id: dados.consultor_id,
    sdr_id: dados.sdr_id,
    consultor_interno_id: dados.consultor_interno_id,
    executado_por_id: null, // Não referenciar usuarios, apenas armazenar nome e tipo
    executado_por_nome: dados.executado_por.nome || dados.executado_por.username,
    executado_por_tipo: dados.executado_por.tipo,
    acao_descricao: `Agendamento criado por ${dados.executado_por.nome || dados.executado_por.username}`,
    empresa_id: dados.executado_por.empresa_id
  });
};

// Função auxiliar para criar movimentação de agendamento atribuído
const criarMovimentacaoAgendamentoAtribuido = async (agendamentoId, dados) => {
  return await registrarMovimentacao({
    tipo: 'agendamento_atribuido',
    registro_tipo: 'agendamento',
    registro_id: agendamentoId,
    consultor_id: dados.consultor_id,
    sdr_id: dados.sdr_id,
    consultor_interno_id: dados.consultor_interno_id,
    executado_por_id: null, // Não referenciar usuarios, apenas armazenar nome e tipo
    executado_por_nome: dados.executado_por.nome || dados.executado_por.username,
    executado_por_tipo: dados.executado_por.tipo,
    acao_descricao: `Agendamento atribuído ao consultor interno ${dados.consultor_interno_nome}`,
    empresa_id: dados.executado_por.empresa_id
  });
};

// Função auxiliar para criar movimentação de fechamento criado
const criarMovimentacaoFechamentoCriado = async (fechamentoId, dados) => {
  return await registrarMovimentacao({
    tipo: 'fechamento_criado',
    registro_tipo: 'fechamento',
    registro_id: fechamentoId,
    consultor_id: dados.consultor_id,
    sdr_id: dados.sdr_id,
    consultor_interno_id: dados.consultor_interno_id,
    executado_por_id: null, // Não referenciar usuarios, apenas armazenar nome e tipo
    executado_por_nome: dados.executado_por.nome || dados.executado_por.username,
    executado_por_tipo: dados.executado_por.tipo,
    acao_descricao: `Fechamento criado por ${dados.executado_por.nome || dados.executado_por.username}`,
    dados_novos: dados.dados_novos || null,
    empresa_id: dados.executado_por.empresa_id
  });
};

const getMovimentacoesRelatorio = async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      tipo, 
      consultor_id, 
      data_inicio, 
      data_fim, 
      empresa_id 
    } = req.query;

    let query = supabaseAdmin
      .from('movimentacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    if (consultor_id) {
      query = query.or(`consultor_id.eq.${consultor_id},sdr_id.eq.${consultor_id},consultor_interno_id.eq.${consultor_id}`);
    }

    if (data_inicio) {
      query = query.gte('created_at', data_inicio);
    }

    if (data_fim) {
      query = query.lte('created_at', data_fim + 'T23:59:59');
    }

    if (empresa_id) {
      query = query.eq('empresa_id', empresa_id);
    } else if ((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }

    // Buscar total de registros
    const { count, error: countError } = await supabaseAdmin
      .from('movimentacoes')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    const { data, error } = await query;
    if (error) throw error;

    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(m => m.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(m => m.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(m => m.consultor_interno_id).filter(Boolean))];
    
    const allConsultoresIds = [...new Set([...consultoresIds, ...sdrIds, ...consultorInternoIds])];
    
    let consultoresNomes = {};
    if (allConsultoresIds.length > 0) {
      const { data: consultoresData } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', allConsultoresIds);
      
      consultoresNomes = consultoresData?.reduce((acc, c) => {
        acc[c.id] = c.nome;
        return acc;
      }, {}) || {};
    }

    // Adicionar nomes dos consultores aos dados
    const movimentacoesComNomes = data.map(movimentacao => ({
      ...movimentacao,
      consultores: movimentacao.consultor_id ? { nome: consultoresNomes[movimentacao.consultor_id] } : null,
      sdr: movimentacao.sdr_id ? { nome: consultoresNomes[movimentacao.sdr_id] } : null,
      consultor_interno: movimentacao.consultor_interno_id ? { nome: consultoresNomes[movimentacao.consultor_interno_id] } : null
    }));

    res.json({
      movimentacoes: movimentacoesComNomes,
      total: count,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registrarMovimentacao,
  getMovimentacoesUsuario,
  getMovimentacoesPaciente,
  getRelatorioMovimentacoes,
  getMovimentacoesRecentes,
  criarMovimentacaoLeadAtribuido,
  criarMovimentacaoAgendamentoCriado,
  criarMovimentacaoAgendamentoAtribuido,
  criarMovimentacaoFechamentoCriado,
  getMovimentacoesRelatorio
};
