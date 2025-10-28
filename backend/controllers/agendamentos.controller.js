const { supabase, supabaseAdmin } = require('../config/database');
const { STORAGE_BUCKET_DOCUMENTOS } = require('../config/constants');
const { 
  criarMovimentacaoAgendamentoCriado, 
  criarMovimentacaoAgendamentoAtribuido 
} = require('./movimentacoes.controller');

// GET /api/agendamentos - Listar agendamentos
const getAllAgendamentos = async (req, res) => {
  try {
    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone, empreendimento_id),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    // Se for clínica, filtrar apenas agendamentos desta clínica
    if (req.user.tipo === 'clinica') {
      query = query.eq('clinica_id', req.user.clinica_id);
    }
    // Se for admin, parceiro ou consultor interno, filtrar apenas agendamentos da empresa
    else if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
              (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus agendamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os agendamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(a => a.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(a => a.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(a => a.consultor_interno_id).filter(Boolean))];
    
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

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: consultoresNomes[agendamento.consultor_id] || null,
      sdr_nome: consultoresNomes[agendamento.sdr_id] || null,
      consultor_interno_nome: consultoresNomes[agendamento.consultor_interno_id] || null,
      clinica_nome: agendamento.clinicas?.nome,
      empreendimento_id: agendamento.pacientes?.empreendimento_id || agendamento.empreendimento_id // Usar empreendimento_id do paciente
    }));

    // Log temporário para debug
    console.log('🔍 Agendamentos retornados:', formattedData.map(a => ({
      id: a.id,
      paciente_nome: a.paciente_nome,
      clinica_id: a.clinica_id,
      empreendimento_id: a.empreendimento_id,
      paciente_empreendimento_id: a.pacientes?.empreendimento_id
    })));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/agendamentos - Listar agendamentos para dashboard
const getDashboardAgendamentos = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone, empreendimento_id),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    // Se for admin, parceiro ou consultor interno, filtrar apenas agendamentos da empresa
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus agendamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os agendamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(a => a.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(a => a.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(a => a.consultor_interno_id).filter(Boolean))];
    
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

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: consultoresNomes[agendamento.consultor_id] || null,
      sdr_nome: consultoresNomes[agendamento.sdr_id] || null,
      consultor_interno_nome: consultoresNomes[agendamento.consultor_interno_id] || null,
      clinica_nome: agendamento.clinicas?.nome,
      empreendimento_id: agendamento.pacientes?.empreendimento_id || agendamento.empreendimento_id // Usar empreendimento_id do paciente
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/agendamentos - Criar agendamento
const createAgendamento = async (req, res) => {
  try {
    const { paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes, consultor_interno_id } = req.body;
    
    // Buscar dados completos do paciente para copiar os IDs
    const { data: pacienteData, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('empresa_id, consultor_id, sdr_id, consultor_interno_id')
      .eq('id', paciente_id)
      .single();
    
    if (pacienteError) {
      console.error('Erro ao buscar paciente:', pacienteError);
      return res.status(400).json({ error: 'Paciente não encontrado' });
    }
    
    const empresa_id = pacienteData?.empresa_id || req.user?.empresa_id;
    
    // Determinar consultor_interno_id (do body ou do usuário que está criando)
    let consultorInternoIdFinal = consultor_interno_id;
    if (!consultorInternoIdFinal) {
      // Se não foi fornecido, usar o ID do usuário se for consultor interno
      if (req.user.tipo === 'consultor' && req.user.consultor_id) {
        consultorInternoIdFinal = req.user.consultor_id;
      }
    }
    
    // Para incorporadora (empresa_id = 5), não usar clinica_id
    const dadosAgendamento = {
      paciente_id,
      consultor_id: pacienteData.consultor_id, // freelancer que indicou
      sdr_id: pacienteData.sdr_id, // SDR que trabalhou o lead
      consultor_interno_id: consultorInternoIdFinal, // consultor interno que vai atender
      data_agendamento,
      horario,
      status: status || 'agendado',
      observacoes,
      empresa_id
    };
    
    // Só incluir clinica_id se não for incorporadora
    if (empresa_id !== 5) {
      dadosAgendamento.clinica_id = clinica_id;
    }
    
    // Primeiro, tenta inserir normalmente
    let { data, error } = await supabaseAdmin
      .from('agendamentos')
      .insert([dadosAgendamento])
      .select();

    // Se der erro de chave duplicada, tenta corrigir a sequência
    if (error && error.message.includes('duplicate key value violates unique constraint')) {
      console.log('Erro de sequência detectado, tentando corrigir...');
      
      // Corrigir a sequência
      await supabaseAdmin.rpc('reset_agendamentos_sequence');
      
      // Tentar inserir novamente
      const retryResult = await supabaseAdmin
        .from('agendamentos')
        .insert([dadosAgendamento])
        .select();
      
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;

    // Atualizar status do paciente para "agendado" e consultor_interno_id se foi atribuído
    if (paciente_id) {
      const updateData = { status: 'agendado' };
      
      // Se foi atribuído um consultor interno, atualizar também na tabela pacientes
      if (dadosAgendamento.consultor_interno_id) {
        updateData.consultor_interno_id = dadosAgendamento.consultor_interno_id;
        console.log('✅ Atualizando consultor_interno_id na tabela pacientes:', dadosAgendamento.consultor_interno_id);
      }
      
      await supabaseAdmin
        .from('pacientes')
        .update(updateData)
        .eq('id', paciente_id);
    }

    // Registrar movimentação de agendamento criado
    try {
      const agendamentoId = data[0].id;
      await criarMovimentacaoAgendamentoCriado(agendamentoId, {
        consultor_id: dadosAgendamento.consultor_id,
        sdr_id: dadosAgendamento.sdr_id,
        consultor_interno_id: dadosAgendamento.consultor_interno_id,
        executado_por: req.user
      });
      console.log('✅ Movimentação de agendamento criado registrada');
      
      // Se o consultor interno é diferente do SDR, registrar movimentação de atribuição
      if (dadosAgendamento.sdr_id && dadosAgendamento.consultor_interno_id && 
          dadosAgendamento.sdr_id !== dadosAgendamento.consultor_interno_id) {
        
        // Buscar nome do consultor interno
        const { data: consultorInterno } = await supabaseAdmin
          .from('consultores')
          .select('nome')
          .eq('id', dadosAgendamento.consultor_interno_id)
          .single();
        
        await criarMovimentacaoAgendamentoAtribuido(agendamentoId, {
          consultor_id: dadosAgendamento.consultor_id,
          sdr_id: dadosAgendamento.sdr_id,
          consultor_interno_id: dadosAgendamento.consultor_interno_id,
          consultor_interno_nome: consultorInterno?.nome || 'Consultor',
          executado_por: req.user
        });
        console.log('✅ Movimentação de agendamento atribuído registrada');
      }
    } catch (movimentacaoError) {
      console.error('⚠️ Erro ao registrar movimentações:', movimentacaoError);
      // Não falhar a operação principal se houver erro na movimentação
    }

    // Emitir evento Socket.IO para notificar incorporadora sobre novo agendamento
    // ATUALIZADO: Agora também emite quando é um corretor que criou o agendamento
    const temSDR = !!dadosAgendamento.sdr_id;
    const temCorretor = !!dadosAgendamento.consultor_interno_id;
    
    if (req.io && (temSDR || temCorretor) && empresa_id === 5) {
      // Determinar qual ID buscar (SDR ou Corretor)
      const consultorId = temCorretor ? dadosAgendamento.consultor_interno_id : dadosAgendamento.sdr_id;
      const tipoCriador = temCorretor ? 'corretor' : 'sdr';
      
      console.log('📢 [SOCKET.IO] Emitindo evento new-agendamento-incorporadora:', {
        agendamentoId: data[0].id,
        paciente_id: paciente_id,
        consultor_id: consultorId,
        tipo_criador: tipoCriador,
        sdr_id: dadosAgendamento.sdr_id,
        corretor_id: dadosAgendamento.consultor_interno_id,
        empresa_id: empresa_id,
        data_agendamento: data_agendamento,
        horario: horario,
        timestamp: new Date().toISOString(),
        room: 'incorporadora-notifications'
      });
      
      // Buscar dados do SDR ou Corretor com foto e música
      const { data: consultorData } = await supabaseAdmin
        .from('consultores')
        .select('nome, foto_url, musica_url')
        .eq('id', consultorId)
        .single();

      console.log(`👤 [SOCKET.IO] Dados do ${tipoCriador} encontrados:`, {
        id: consultorId,
        tipo: tipoCriador,
        nome: consultorData?.nome || 'N/A',
        temFoto: !!consultorData?.foto_url,
        temMusica: !!consultorData?.musica_url
      });

      // Buscar dados do paciente
      const { data: pacienteData } = await supabaseAdmin
        .from('pacientes')
        .select('nome, telefone')
        .eq('id', paciente_id)
        .single();

      console.log('👤 [SOCKET.IO] Dados do paciente encontrados:', {
        paciente_id: paciente_id,
        nome: pacienteData?.nome || 'N/A',
        telefone: pacienteData?.telefone || 'N/A'
      });

      req.io.to('incorporadora-notifications').emit('new-agendamento-incorporadora', {
        agendamentoId: data[0].id,
        paciente_nome: pacienteData?.nome || 'Cliente',
        paciente_telefone: pacienteData?.telefone || '',
        data_agendamento: data_agendamento,
        horario: horario,
        sdr_id: dadosAgendamento.sdr_id,
        sdr_nome: consultorData?.nome || 'SDR/Corretor',
        sdr_foto: consultorData?.foto_url || null,
        sdr_musica: consultorData?.musica_url || null,
        consultor_interno_id: dadosAgendamento.consultor_interno_id,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ [SOCKET.IO] Evento new-agendamento-incorporadora enviado para grupo incorporadora-notifications');
    } else {
      console.log('⚠️ [SOCKET.IO] Evento new-agendamento-incorporadora não enviado:', {
        temSocketIO: !!req.io,
        temSdrId: !!dadosAgendamento.sdr_id,
        temCorretorId: !!dadosAgendamento.consultor_interno_id,
        empresaId: empresa_id,
        motivo: !req.io ? 'Socket.IO não disponível' : 
                (!dadosAgendamento.sdr_id && !dadosAgendamento.consultor_interno_id) ? 'Sem sdr_id nem consultor_interno_id' : 
                empresa_id !== 5 ? 'Não é incorporadora' : 'Desconhecido'
      });
    }

    res.json({ id: data[0].id, message: 'Agendamento criado com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/agendamentos/:id - Atualizar agendamento
const updateAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .update({ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Se mudou o paciente do agendamento, atualizar status do novo paciente
    if (paciente_id) {
      await supabaseAdmin
        .from('pacientes')
        .update({ status: 'agendado' })
        .eq('id', paciente_id);
    }

    res.json({ id: data[0].id, message: 'Agendamento atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/agendamentos/:id/status - Atualizar status do agendamento
const updateStatusAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Buscar dados do agendamento primeiro
    const { data: agendamento, error: agendamentoError } = await supabaseAdmin
      .from('agendamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (agendamentoError) throw agendamentoError;
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Atualizar status do agendamento
    const { error } = await supabaseAdmin
      .from('agendamentos')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    // Automação do pipeline: se status for "fechado", criar fechamento
    // NOTA: A criação do fechamento agora é feita pelo frontend via modal de valor
    if (status === 'fechado') {
      // Apenas atualizar status do paciente para "fechado"
      await supabaseAdmin
        .from('pacientes')
        .update({ status: 'fechado' })
        .eq('id', agendamento.paciente_id);
    }

    res.json({ message: 'Status atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/agendamentos/:id/lembrado - Marcar como lembrado
const marcarLembrado = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from('agendamentos')
      .update({ lembrado: true })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Paciente marcado como lembrado!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/agendamentos/:id - Excluir agendamento (apenas admin)
const deleteAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Agendamento removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/evidencias/upload - Upload de evidência
const uploadEvidencia = async (req, res) => {
  try {
    const { tipo, registro_id, status_anterior, status_novo, observacao } = req.body;
    
    console.log('📸 Upload de evidência recebido:', {
      tipo,
      registro_id,
      status_anterior,
      status_novo,
      file: req.file?.originalname
    });
    
    // Validações
    if (!tipo || !registro_id || !status_novo) {
      return res.status(400).json({ error: 'Tipo, registro_id e status_novo são obrigatórios!' });
    }
    
    if (!['paciente', 'clinica', 'nova_clinica', 'agendamento', 'fechamento'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido! Use: paciente, clinica, nova_clinica, agendamento ou fechamento' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de evidência é obrigatório!' });
    }
    
    // Validar tipo de arquivo (apenas imagens)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Apenas arquivos JPG e PNG são permitidos!' });
    }
    
    // Validar tamanho (máx 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Arquivo muito grande! Máximo 5MB.' });
    }
    
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extensao = req.file.originalname.split('.').pop();
    const fileName = `${tipo}s/${registro_id}/${timestamp}_${status_novo}.${extensao}`;
    
    console.log('📤 Fazendo upload para Supabase Storage:', fileName);
    
    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('evidencias-status')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError);
      throw uploadError;
    }
    
    // Obter URL pública (assinada para bucket privado)
    const { data: urlData } = await supabaseAdmin.storage
      .from('evidencias-status')
      .createSignedUrl(fileName, 31536000); // 1 ano
    
    const evidenciaUrl = urlData?.signedUrl;
    
    console.log('✅ Upload concluído. URL:', evidenciaUrl);
    
    // Obter timestamp atual em horário de Brasília (UTC-3)
    const agora = new Date();
    const brasiliaOffset = -3 * 60; // UTC-3 em minutos
    const localOffset = agora.getTimezoneOffset(); // offset do servidor em minutos
    const brasiliaTime = new Date(agora.getTime() + (localOffset - brasiliaOffset) * 60000);
    
    // Salvar registro na tabela de histórico
    const { data: historicoData, error: historicoError } = await supabaseAdmin
      .from('historico_status_evidencias')
      .insert([{
        tipo,
        registro_id: parseInt(registro_id),
        status_anterior: status_anterior || null,
        status_novo,
        evidencia_url: evidenciaUrl,
        evidencia_filename: req.file.originalname,
        observacao: observacao || null,
        alterado_por_id: req.user?.id || null,
        alterado_por_nome: req.user?.nome || req.user?.username || null,
        empresa_id: req.user?.empresa_id || 3, // Usar empresa_id do usuário ou 3 (Invest Money) como padrão
        created_at: brasiliaTime.toISOString()
      }])
      .select();
    
    if (historicoError) {
      console.error('❌ Erro ao salvar histórico:', historicoError);
      // Tentar deletar arquivo do storage se falhou salvar no banco
      await supabaseAdmin.storage.from('evidencias-status').remove([fileName]);
      throw historicoError;
    }
    
    console.log('✅ Evidência salva com sucesso:', historicoData[0]);
    
    res.json({
      id: historicoData[0].id,
      evidencia_url: evidenciaUrl,
      message: 'Evidência enviada com sucesso!'
    });
    
  } catch (error) {
    console.error('❌ Erro ao fazer upload de evidência:', error);
    res.status(500).json({ error: error.message || 'Erro ao enviar evidência' });
  }
};

// GET /api/evidencias/:tipo/:registroId - Buscar evidências de um registro
const getEvidencias = async (req, res) => {
  try {
    const { tipo, registroId } = req.params;
    
    // Validar tipo
    if (!['paciente', 'clinica', 'nova_clinica', 'agendamento', 'fechamento'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido!' });
    }
    
    // Buscar evidências
    const { data, error } = await supabaseAdmin
      .from('historico_status_evidencias')
      .select('*')
      .eq('tipo', tipo)
      .eq('registro_id', parseInt(registroId))
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Erro ao buscar evidências:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/evidencias/todas - Listar todas as evidências (apenas admin)
const getAllEvidencias = async (req, res) => {
  try {
    console.log('📋 Buscando evidências para usuário:', {
      tipo: req.user.tipo,
      empresa_id: req.user.empresa_id
    });
    
    let query = supabaseAdmin
      .from('historico_status_evidencias')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Se for admin ou parceiro, filtrar apenas evidências da empresa
    if ((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) {
      console.log('🏢 Filtrando evidências da empresa ID:', req.user.empresa_id);
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    
    const { data: evidencias, error } = await query;
    
    if (error) {
      console.error('❌ Erro ao buscar evidências:', error);
      throw error;
    }
    
    // Enriquecer evidências com nomes dos pacientes/clínicas/agendamentos/fechamentos
    const evidenciasEnriquecidas = await Promise.all(evidencias.map(async (ev) => {
      let nomeRegistro = null;
      
      try {
        if (ev.tipo === 'paciente') {
          const { data: paciente } = await supabaseAdmin
            .from('pacientes')
            .select('nome')
            .eq('id', ev.registro_id)
            .single();
          nomeRegistro = paciente?.nome;
        } else if (ev.tipo === 'clinica') {
          const { data: clinica } = await supabaseAdmin
            .from('clinicas')
            .select('nome')
            .eq('id', ev.registro_id)
            .single();
          nomeRegistro = clinica?.nome;
        } else if (ev.tipo === 'nova_clinica') {
          const { data: clinica } = await supabaseAdmin
            .from('novas_clinicas')
            .select('nome')
            .eq('id', ev.registro_id)
            .single();
          nomeRegistro = clinica?.nome;
        } else if (ev.tipo === 'agendamento') {
          const { data: agendamento } = await supabaseAdmin
            .from('agendamentos')
            .select('paciente_id, pacientes(nome)')
            .eq('id', ev.registro_id)
            .single();
          nomeRegistro = agendamento?.pacientes?.nome ? `Agendamento - ${agendamento.pacientes.nome}` : null;
        } else if (ev.tipo === 'fechamento') {
          const { data: fechamento } = await supabaseAdmin
            .from('fechamentos')
            .select('paciente_id, pacientes(nome)')
            .eq('id', ev.registro_id)
            .single();
          nomeRegistro = fechamento?.pacientes?.nome ? `Fechamento - ${fechamento.pacientes.nome}` : null;
        }
      } catch (err) {
        console.warn(`⚠️ Não foi possível buscar nome para ${ev.tipo} ID ${ev.registro_id}`);
      }
      
      return {
        ...ev,
        nome_registro: nomeRegistro || `ID ${ev.registro_id}`
      };
    }));
    
    console.log(`✅ ${evidenciasEnriquecidas?.length || 0} evidências encontradas`);
    
    res.json({
      evidencias: evidenciasEnriquecidas || [],
      total: evidenciasEnriquecidas?.length || 0
    });
  } catch (error) {
    console.error('❌ Erro ao buscar todas as evidências:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAgendamentos,
  getDashboardAgendamentos,
  createAgendamento,
  updateAgendamento,
  updateStatusAgendamento,
  marcarLembrado,
  deleteAgendamento,
  uploadEvidencia,
  getEvidencias,
  getAllEvidencias
};

