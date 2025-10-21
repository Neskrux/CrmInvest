const { supabase, supabaseAdmin } = require('../config/database');

// GET /api/novas-clinicas - Listar novas clínicas
const getAllNovasClinicas = async (req, res) => {
  try {
    console.log('🔍 DEBUG /api/novas-clinicas - Dados do usuário:');
    console.log('🔍 Tipo:', req.user.tipo);
    console.log('🔍 pode_ver_todas_novas_clinicas:', req.user.pode_ver_todas_novas_clinicas);
    console.log('🔍 podealterarstatus:', req.user.podealterarstatus);
    console.log('🔍 is_freelancer:', req.user.is_freelancer);
    
    let query = supabase
      .from('novas_clinicas')
      .select(`
        *,
        consultores!criado_por_consultor_id(
          nome, 
          empresa_id
        )
      `)
      .order('created_at', { ascending: false });

    // Se for consultor freelancer, mostrar apenas suas próprias clínicas
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todas as novas clínicas
    // Funcionários de empresa veem clínicas da empresa (filtrado depois)
    const isConsultorInterno = req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true;
    const isFreelancer = req.user.tipo === 'consultor' && !isConsultorInterno && req.user.is_freelancer === true;
    
    console.log('🔍 É consultor interno?', isConsultorInterno);
    console.log('🔍 É freelancer?', isFreelancer);
    console.log('🔍 Tem empresa_id?', req.user.empresa_id);
    console.log('🔍 is_freelancer?', req.user.is_freelancer);
    
    if (isFreelancer) {
      // Freelancer (com ou sem empresa): só vê suas próprias clínicas
      console.log('🔍 Aplicando filtro para freelancer - ID:', req.user.id);
      query = query.eq('criado_por_consultor_id', req.user.id);
      console.log('🔍 Query filtrada aplicada');
    } else if ((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) {
      // Admin/Parceiro: filtrar por empresa_id na query (mais eficiente)
      console.log('🔍 Aplicando filtro para admin/parceiro - empresa_id:', req.user.empresa_id);
      query = query.eq('empresa_id', req.user.empresa_id);
    } else if (req.user.tipo === 'consultor' && req.user.empresa_id && req.user.is_freelancer === false && !isConsultorInterno) {
      // Funcionário de empresa: filtrar por empresa_id na query
      console.log('🔍 Aplicando filtro para funcionário de empresa - empresa_id:', req.user.empresa_id);
      query = query.eq('empresa_id', req.user.empresa_id);
    } else {
      console.log('🔍 Usuário tem acesso a todas as novas clínicas (consultor interno)');
    }
    // Admin e consultores internos veem todas as novas clínicas (com ou sem consultor_id)

    const { data, error } = await query;
    
    console.log('🔍 Total de clínicas retornadas:', data ? data.length : 0);
    if (data && data.length > 0) {
      console.log('🔍 Primeiras 3 clínicas:');
      data.slice(0, 3).forEach((clinica, index) => {
        console.log(`🔍 Clínica ${index + 1}: ID=${clinica.id}, Nome=${clinica.nome}, criado_por_consultor_id=${clinica.criado_por_consultor_id}`);
      });
    }

    if (error) throw error;
    
    // Reformatar dados para incluir nome do consultor, empresa_id e nome da parceiro
    const formattedData = data.map(clinica => ({
      ...clinica,
      consultor_indicador_nome: clinica.consultores?.nome,
      consultor_nome: clinica.consultores?.nome, // Mantém compatibilidade
      // empresa_id: pode vir diretamente da clínica ou do consultor
      empresa_id: clinica.empresa_id || clinica.consultores?.empresa_id || null
    }));
    
    // Dados já filtrados na query, não precisa filtrar novamente
    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/novas-clinicas - Criar nova clínica
const createNovaClinica = async (req, res) => {
  try {
    const { nome, cnpj, responsavel, endereco, bairro, cidade, estado, nicho, telefone, email, status, observacoes } = req.body;
    
    // Normalizar telefone e CNPJ (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cnpjNumeros = cnpj ? cnpj.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('novas_clinicas')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const clinicaExistente = telefoneExistente[0];
        const dataCadastro = new Date(clinicaExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${clinicaExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;
    
    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
        // Continua sem coordenadas se falhar
      }
    }
    
    // Preparar dados para inserção
    const clinicaData = {
      nome,
      cnpj: cnpjNumeros, // Salvar apenas números
      responsavel,
      endereco,
      bairro,
      cidade,
      estado,
      nicho,
      telefone: telefoneNumeros, // Salvar apenas números
      email,
      status: status || 'tem_interesse',
      observacoes,
      latitude,
      longitude,
      criado_por_consultor_id: req.user.tipo === 'consultor' ? req.user.id : null,
      empresa_id: req.user.tipo === 'parceiro' ? req.user.id : null, // Setar empresa_id quando parceiro cadastra diretamente
      tipo_origem: 'aprovada' // Todas as novas clínicas serão aprovadas
    };
    
    const { data, error } = await supabaseAdmin
      .from('novas_clinicas')
      .insert([clinicaData])
      .select();

    if (error) throw error;
    
    console.log('✅ Nova clínica cadastrada com sucesso:', {
      id: data[0].id,
      nome: data[0].nome,
      cidade: data[0].cidade,
      estado: data[0].estado,
      consultor_id: data[0].criado_por_consultor_id
    });
    
    // Emitir evento Socket.IO para notificar admins sobre nova clínica
    if (req.io) {
      console.log('📢 Emitindo evento new-clinica via Socket.IO');
      req.io.to('clinicas-notifications').emit('new-clinica', {
        clinicaId: data[0].id,
        nome: data[0].nome,
        cidade: data[0].cidade,
        estado: data[0].estado,
        telefone: data[0].telefone,
        email: data[0].email,
        nicho: data[0].nicho,
        status: data[0].status,
        observacoes: data[0].observacoes,
        criado_por_consultor_id: data[0].criado_por_consultor_id,
        created_at: data[0].created_at
      });
      
      // Atualizar contagem de novas clínicas para admins
      // Função updateClinicasCount será chamada pelo server.js
    }
    
    res.json({ id: data[0].id, message: 'Nova clínica cadastrada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/novas-clinicas/:id - Editar nova clínica (apenas admin)
const updateNovaClinica = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cnpj, responsavel, endereco, bairro, cidade, estado, nicho, telefone, email, status, observacoes } = req.body;
    
    // Normalizar telefone e CNPJ (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cnpjNumeros = cnpj ? cnpj.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe (excluindo a própria clínica)
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('novas_clinicas')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .neq('id', id)
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const clinicaExistente = telefoneExistente[0];
        const dataCadastro = new Date(clinicaExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${clinicaExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;
    
    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
        // Continua sem coordenadas se falhar
      }
    }
    
    // Preparar dados para atualização
    const clinicaData = {
      nome,
      cnpj: cnpjNumeros,
      responsavel,
      endereco,
      bairro,
      cidade,
      estado,
      nicho,
      telefone: telefoneNumeros,
      email,
      status: status || 'tem_interesse',
      observacoes,
      latitude,
      longitude
    };
    
    const { data, error } = await supabaseAdmin
      .from('novas_clinicas')
      .update(clinicaData)
      .eq('id', id)
      .select();

    if (error) throw error;
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Nova clínica não encontrada' });
    }
    
    console.log('✅ Nova clínica atualizada com sucesso:', {
      id: data[0].id,
      nome: data[0].nome,
      cidade: data[0].cidade,
      estado: data[0].estado
    });
    
    res.json({ message: 'Nova clínica atualizada com sucesso!', clinica: data[0] });
  } catch (error) {
    console.error('Erro ao atualizar nova clínica:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/novas-clinicas/:id/pegar - Pegar clínica (apenas admin)
const pegarClinica = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a clínica ainda está disponível
    const { data: clinicaAtual, error: checkError } = await supabaseAdmin
      .from('novas_clinicas')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (clinicaAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Esta clínica já foi aprovada!' });
    }

    // Apenas admins podem aprovar clínicas
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar clínicas!' });
    }

    // Mover a clínica da tabela novas_clinicas para clinicas (Em Análise)
    const clinicaParaMover = {
      nome: clinicaAtual.nome,
      endereco: clinicaAtual.endereco,
      bairro: clinicaAtual.bairro,
      cidade: clinicaAtual.cidade,
      estado: clinicaAtual.estado,
      nicho: clinicaAtual.nicho,
      telefone: clinicaAtual.telefone,
      email: clinicaAtual.email,
      status: 'aguardando_documentacao', // Status inicial quando vai para análise
      em_analise: true, // Marcar como em análise
      consultor_id: null, // Consultor interno será atribuído depois
      criado_por_consultor_id: clinicaAtual.criado_por_consultor_id, // Freelancer que indicou
      empresa_id: clinicaAtual.empresa_id, // Transferir empresa_id se foi parceiro que cadastrou
      tipo_origem: 'aprovada' // Clínicas aprovadas da aba "Novas Clínicas"
    };

    // Excluir o campo id para evitar conflitos de chave primária
    delete clinicaParaMover.id;

    // Inserir na tabela clinicas
    const { data: clinicaInserida, error: insertError } = await supabaseAdmin
      .from('clinicas')
      .insert([clinicaParaMover])
      .select();

    if (insertError) throw insertError;

    console.log('✅ Clínica movida para análise com sucesso! ID:', clinicaInserida[0]?.id);
    console.log('   - Consultor responsável:', clinicaAtual.criado_por_consultor_id);

    // Remover da tabela novas_clinicas
    const { error: deleteError } = await supabaseAdmin
      .from('novas_clinicas')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    
    // Emitir evento Socket.IO para atualizar contagem de novas clínicas
    if (req.io) {
      console.log('📢 Clínica aprovada - atualizando contagem via Socket.IO');
      // Função updateClinicasCount será chamada pelo server.js
    }

    res.json({ message: 'Clínica aprovada e movida para análise com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/novas-clinicas/:id/status - Atualizar status de nova clínica
const updateStatusNovaClinica = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, evidencia_id, consultor_id } = req.body;
    
    console.log('🔧 PUT /api/novas-clinicas/:id/status recebido');
    console.log('🔧 ID da clínica:', id);
    console.log('🔧 Novo status:', status);
    console.log('🔧 Consultor ID:', consultor_id);
    console.log('🔧 Usuário autenticado:', req.user);
    
    // Verificar se o status é válido
    const statusValidos = [
      'sem_primeiro_contato', 
      'tem_interesse', 
      'nao_tem_interesse', 
      'em_contato', 
      'reuniao_marcada', 
      'aguardando_documentacao', 
      'nao_fechou',
      'nao_e_nosso_publico',
      'nao_responde'
    ];
    if (!status || !statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido! Status válidos: ' + statusValidos.join(', ') });
    }
    
    // Verificar permissões: admin ou consultor com permissão
    const podeAlterarStatus = req.user.tipo === 'admin' || 
      (req.user.tipo === 'consultor' && req.user.podealterarstatus === true);
    
    if (!podeAlterarStatus) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar o status de clínicas!' });
    }
    
    // Verificar se a clínica existe
    const { data: clinicaAtual, error: checkError } = await supabaseAdmin
      .from('novas_clinicas')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('❌ Erro ao buscar clínica:', checkError);
    return res.status(404).json({ error: 'Clínica não encontrada!' });
    }
    
    if (!clinicaAtual) {
      return res.status(404).json({ error: 'Clínica não encontrada!' });
    }
    
    console.log('✅ Clínica encontrada:', clinicaAtual.nome);
    
    // Preparar dados para atualização
    const updateData = { status: status };
    
    // Se foi fornecido um consultor_id e o status é "reuniao_marcada", atualizar o consultor_id
    if (consultor_id && status === 'reuniao_marcada') {
      updateData.consultor_id = consultor_id;
      console.log('👤 Atribuindo consultor interno:', consultor_id);
    }
    
    // Atualizar o status da clínica (e consultor_id se aplicável)
    const { data: clinicaAtualizada, error: updateError } = await supabaseAdmin
      .from('novas_clinicas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar status:', updateError);
      throw updateError;
    }
    
    console.log('✅ Status atualizado com sucesso!');
    if (consultor_id && status === 'reuniao_marcada') {
      console.log('✅ Consultor interno atribuído com sucesso!');
    }
    
    res.json({ 
      message: 'Status atualizado com sucesso!',
      clinica: clinicaAtualizada
    });
  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/novas-clinicas/:id - Excluir nova clínica (apenas admin)
const deleteNovaClinica = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ DELETE /api/novas-clinicas/:id recebido');
    console.log('🗑️ ID da nova clínica:', id);
    console.log('🗑️ Usuário autenticado:', req.user);

    // Excluir a nova clínica
    const { error } = await supabaseAdmin
      .from('novas_clinicas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro do Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Nova clínica excluída com sucesso:', id);
    res.json({ message: 'Nova clínica excluída com sucesso!' });
  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllNovasClinicas,
  createNovaClinica,
  updateNovaClinica,
  pegarClinica,
  updateStatusNovaClinica,
  deleteNovaClinica
};

