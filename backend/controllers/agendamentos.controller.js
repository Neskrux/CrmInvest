const { supabase, supabaseAdmin } = require('../config/database');
const { STORAGE_BUCKET_DOCUMENTOS } = require('../config/constants');

// GET /api/agendamentos - Listar agendamentos
const getAllAgendamentos = async (req, res) => {
  try {
    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    // Se for clínica, filtrar apenas agendamentos desta clínica
    if (req.user.tipo === 'clinica') {
      query = query.eq('clinica_id', req.user.clinica_id);
    }
    // Se for admin ou parceiro, filtrar apenas agendamentos de consultores da empresa
    else if ((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus agendamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os agendamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
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

// GET /api/dashboard/agendamentos - Listar agendamentos para dashboard
const getDashboardAgendamentos = async (req, res) => {
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

    // Se for admin ou parceiro, filtrar apenas agendamentos de consultores da empresa
    if ((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus agendamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os agendamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
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

// POST /api/agendamentos - Criar agendamento
const createAgendamento = async (req, res) => {
  try {
    const { paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes } = req.body;
    
    // Primeiro, tenta inserir normalmente
    let { data, error } = await supabaseAdmin
      .from('agendamentos')
      .insert([{ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status: status || 'agendado', observacoes }])
      .select();

    // Se der erro de chave duplicada, tenta corrigir a sequência
    if (error && error.message.includes('duplicate key value violates unique constraint')) {
      console.log('Erro de sequência detectado, tentando corrigir...');
      
      // Corrigir a sequência
      await supabaseAdmin.rpc('reset_agendamentos_sequence');
      
      // Tentar inserir novamente
      const retryResult = await supabaseAdmin
        .from('agendamentos')
        .insert([{ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status: status || 'agendado', observacoes }])
        .select();
      
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;

    // Atualizar status do paciente para "agendado"
    if (paciente_id) {
      await supabaseAdmin
        .from('pacientes')
        .update({ status: 'agendado' })
        .eq('id', paciente_id);
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

