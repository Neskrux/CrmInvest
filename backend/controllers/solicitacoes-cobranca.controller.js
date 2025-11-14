const { supabase, supabaseAdmin } = require('../config/database');

// GET /api/solicitacoes-cobranca - Listar solicitações
const listarSolicitacoes = async (req, res) => {
  try {
    const { tipo, clinica_id, empresa_id, id: user_id } = req.user;
    
    console.log('📋 [SOLICITAÇÕES] Listando solicitações para:', { tipo, clinica_id, empresa_id, user_id });
    
    let query = supabaseAdmin
      .from('solicitacoes_cobranca')
      .select(`
        *,
        clinicas(nome),
        usuarios!solicitacoes_cobranca_usuario_id_fkey(nome),
        aprovado_por_usuario:usuarios!solicitacoes_cobranca_aprovado_por_fkey(nome)
      `)
      .order('created_at', { ascending: false });

    // Filtrar por clínica se for usuário de clínica
    if (tipo === 'clinica' && clinica_id) {
      query = query.eq('clinica_id', clinica_id);
      console.log('🔍 [SOLICITAÇÕES] Filtrando por clínica:', clinica_id);
    }
    // Se for admin da empresa_id 3, ver todas as solicitações
    else if (tipo === 'admin' && empresa_id === 3) {
      console.log('✅ [SOLICITAÇÕES] Admin da empresa_id 3 - vendo todas as solicitações');
      // Não adicionar filtro, ver todas
    }
    // Outros usuários não devem ver solicitações
    else {
      console.log('❌ [SOLICITAÇÕES] Acesso negado:', { tipo, empresa_id });
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('❌ [SOLICITAÇÕES] Erro na query:', error);
      throw error;
    }
    
    console.log('✅ [SOLICITAÇÕES] Retornando', data?.length || 0, 'solicitações');
    if (data && data.length > 0) {
      console.log('📦 [SOLICITAÇÕES] Primeira solicitação:', JSON.stringify(data[0], null, 2));
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('❌ [SOLICITAÇÕES] Erro ao listar solicitações:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/solicitacoes-cobranca/:id - Buscar solicitação específica
const buscarSolicitacao = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, clinica_id, empresa_id } = req.user;

    let query = supabaseAdmin
      .from('solicitacoes_cobranca')
      .select(`
        *,
        clinicas(nome),
        usuarios!solicitacoes_cobranca_usuario_id_fkey(nome),
        aprovado_por_usuario:usuarios!solicitacoes_cobranca_aprovado_por_fkey(nome),
        solicitacao_cobranca_itens(*),
        solicitacao_cobranca_pacientes(*, pacientes(nome, cpf))
      `)
      .eq('id', id)
      .single();

    const { data, error } = await query;
    
    if (error) throw error;
    
    // Verificar permissões
    if (tipo === 'clinica' && data.clinica_id !== clinica_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar solicitação:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/solicitacoes-cobranca - Criar nova solicitação
const criarSolicitacao = async (req, res) => {
  try {
    const { tipo, clinica_id, id: usuario_id } = req.user;
    
    // Apenas clínicas podem criar solicitações
    if (tipo !== 'clinica') {
      return res.status(403).json({ error: 'Apenas clínicas podem criar solicitações' });
    }
    
    // Validar se usuario_id existe na tabela usuarios
    // Se não existir, usar NULL (o clinica_id é suficiente para identificar a clínica)
    let usuario_id_final = null;
    
    if (usuario_id) {
      const { data: usuarioValido, error: validacaoError } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('id', usuario_id)
        .maybeSingle();
      
      if (validacaoError) {
        console.error('Erro ao validar usuario_id:', validacaoError);
        // Continuar com NULL se houver erro na validação
      } else if (usuarioValido && usuarioValido.id) {
        usuario_id_final = usuarioValido.id;
        console.log(`✅ Usuario_id validado: ${usuario_id_final} para clínica ${clinica_id}`);
      } else {
        console.warn(`⚠️ Usuario_id ${usuario_id} não existe na tabela usuarios. Usando NULL.`);
      }
    }

    const {
      pacientes_ids,
      servicos,
      valor_total,
      valor_por_paciente,
      observacoes
    } = req.body;

    // Validações
    if (!pacientes_ids || pacientes_ids.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um paciente' });
    }

    if (!servicos || servicos.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um serviço' });
    }

    // Criar solicitação principal
    const { data: solicitacao, error: errorSolicitacao } = await supabaseAdmin
      .from('solicitacoes_cobranca')
      .insert({
        clinica_id,
        usuario_id: usuario_id_final, // Pode ser NULL se não encontrar o usuario_id
        status: 'pendente',
        valor_total,
        valor_por_paciente,
        quantidade_pacientes: pacientes_ids.length,
        observacoes
      })
      .select()
      .single();

    if (errorSolicitacao) throw errorSolicitacao;

    // Criar itens da solicitação
    const itens = servicos.map(servico => ({
      solicitacao_id: solicitacao.id,
      tipo_servico: servico.tipo,
      nome_servico: servico.nome,
      valor_unitario: servico.valor,
      quantidade: servico.quantidade || 1,
      valor_total: servico.valor * (servico.quantidade || 1),
      tipo_cobranca: servico.tipo_cobranca
    }));

    const { error: errorItens } = await supabaseAdmin
      .from('solicitacao_cobranca_itens')
      .insert(itens);

    if (errorItens) throw errorItens;

    // Criar registros de pacientes
    const pacientes = pacientes_ids.map(paciente_id => ({
      solicitacao_id: solicitacao.id,
      paciente_id
    }));

    const { error: errorPacientes } = await supabaseAdmin
      .from('solicitacao_cobranca_pacientes')
      .insert(pacientes);

    if (errorPacientes) throw errorPacientes;

    res.status(201).json({
      message: 'Solicitação criada com sucesso',
      solicitacao
    });
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/solicitacoes-cobranca/:id/aprovar - Aprovar solicitação
const aprovarSolicitacao = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, empresa_id, id: usuario_id } = req.user;

    // Apenas admin da empresa_id 3 pode aprovar
    if (tipo !== 'admin' || empresa_id !== 3) {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar solicitações' });
    }

    const { data, error } = await supabaseAdmin
      .from('solicitacoes_cobranca')
      .update({
        status: 'aprovado',
        data_aprovacao: new Date().toISOString(),
        aprovado_por: usuario_id
      })
      .eq('id', id)
      .eq('status', 'pendente')
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Solicitação não encontrada ou já processada' });
    }

    res.json({
      message: 'Solicitação aprovada com sucesso',
      solicitacao: data
    });
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/solicitacoes-cobranca/:id/rejeitar - Rejeitar solicitação
const rejeitarSolicitacao = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, empresa_id, id: usuario_id } = req.user;
    const { motivo } = req.body;

    // Apenas admin da empresa_id 3 pode rejeitar
    if (tipo !== 'admin' || empresa_id !== 3) {
      return res.status(403).json({ error: 'Apenas administradores podem rejeitar solicitações' });
    }

    const { data, error } = await supabaseAdmin
      .from('solicitacoes_cobranca')
      .update({
        status: 'rejeitado',
        data_aprovacao: new Date().toISOString(),
        aprovado_por: usuario_id,
        motivo_rejeicao: motivo
      })
      .eq('id', id)
      .eq('status', 'pendente')
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Solicitação não encontrada ou já processada' });
    }

    res.json({
      message: 'Solicitação rejeitada',
      solicitacao: data
    });
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/solicitacoes-cobranca/gastos-mensais - Obter gastos mensais
const obterGastosMensais = async (req, res) => {
  try {
    const { tipo, clinica_id, empresa_id } = req.user;
    
    // Apenas clínicas da empresa_id 3 podem ver seus gastos
    if (tipo !== 'clinica' || empresa_id !== 3) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Buscar solicitações aprovadas do mês atual
    const mesAtual = new Date();
    const primeiroDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const ultimoDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);

    const { data: solicitacoes, error } = await supabaseAdmin
      .from('solicitacoes_cobranca')
      .select(`
        *,
        solicitacao_cobranca_itens(*)
      `)
      .eq('clinica_id', clinica_id)
      .in('status', ['aprovado', 'processado'])
      .gte('created_at', primeiroDiaMes.toISOString())
      .lte('created_at', ultimoDiaMes.toISOString());

    if (error) throw error;

    // Calcular total de gastos extras
    let totalGastosExtras = 0;
    const detalhamento = [];

    solicitacoes.forEach(solicitacao => {
      totalGastosExtras += parseFloat(solicitacao.valor_total || 0);
      
      solicitacao.solicitacao_cobranca_itens.forEach(item => {
        const existente = detalhamento.find(d => d.nome === item.nome_servico);
        if (existente) {
          existente.quantidade += item.quantidade;
          existente.valor += parseFloat(item.valor_total || 0);
        } else {
          detalhamento.push({
            nome: item.nome_servico,
            quantidade: item.quantidade,
            valor: parseFloat(item.valor_total || 0)
          });
        }
      });
    });

    res.json({
      totalGastosExtras,
      detalhamento,
      quantidadeSolicitacoes: solicitacoes.length
    });
  } catch (error) {
    console.error('Erro ao obter gastos mensais:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listarSolicitacoes,
  buscarSolicitacao,
  criarSolicitacao,
  aprovarSolicitacao,
  rejeitarSolicitacao,
  obterGastosMensais
};
