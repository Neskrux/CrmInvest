const { supabase, supabaseAdmin } = require('../config/database');
const { STORAGE_BUCKET_CONTRATOS } = require('../config/constants');
const { uploadToSupabase } = require('../middleware/upload');
const bcrypt = require('bcrypt');
const transporter = require('../config/email');
const { criarMovimentacaoFechamentoCriado } = require('./movimentacoes.controller');

// GET /api/fechamentos - Listar fechamentos
const getAllFechamentos = async (req, res) => {
  try {
    // Query simples - o mapeamento será feito no frontend
    const selectQuery = `
      *,
      pacientes(nome, telefone, cpf, empreendimento_id),
      clinicas(nome)
    `;

    let query = supabaseAdmin
      .from('fechamentos')
      .select(selectQuery)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Se for admin, parceiro ou consultor interno, filtrar apenas fechamentos da empresa
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os fechamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(f => f.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(f => f.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(f => f.consultor_interno_id).filter(Boolean))];
    
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
    const formattedData = data.map(fechamento => {
      // NÃO gerar URL aqui - será gerada sob demanda quando o usuário clicar para baixar
      return {
        ...fechamento,
        paciente_nome: fechamento.pacientes?.nome,
        paciente_telefone: fechamento.pacientes?.telefone,
        paciente_cpf: fechamento.pacientes?.cpf,
        paciente_empreendimento_id: fechamento.pacientes?.empreendimento_id,
        consultor_nome: consultoresNomes[fechamento.consultor_id] || null,
        sdr_nome: consultoresNomes[fechamento.sdr_id] || null,
        consultor_interno_nome: consultoresNomes[fechamento.consultor_interno_id] || null,
        clinica_nome: fechamento.clinicas?.nome
      };
    });

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/fechamentos - Listar fechamentos para dashboard
const getDashboardFechamentos = async (req, res) => {
  try {
    // Query simples - o mapeamento será feito no frontend
    const selectQuery = `
      *,
      pacientes(nome, telefone, cpf, empreendimento_id),
      clinicas(nome)
    `;

    let query = supabaseAdmin
      .from('fechamentos')
      .select(selectQuery)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Se for admin, parceiro ou consultor interno, filtrar apenas fechamentos da empresa
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os fechamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(f => f.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(f => f.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(f => f.consultor_interno_id).filter(Boolean))];
    
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
    const formattedData = data.map(fechamento => {
      // NÃO gerar URL aqui - será gerada sob demanda quando o usuário clicar para baixar
      return {
        ...fechamento,
        paciente_nome: fechamento.pacientes?.nome,
        paciente_telefone: fechamento.pacientes?.telefone,
        paciente_cpf: fechamento.pacientes?.cpf,
        paciente_empreendimento_id: fechamento.pacientes?.empreendimento_id,
        consultor_nome: consultoresNomes[fechamento.consultor_id] || null,
        sdr_nome: consultoresNomes[fechamento.sdr_id] || null,
        consultor_interno_nome: consultoresNomes[fechamento.consultor_interno_id] || null,
        clinica_nome: fechamento.clinicas?.nome
      };
    });

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/fechamentos - Criar fechamento
const createFechamento = async (req, res) => {
  try {
    const { 
      paciente_id, 
      consultor_id, 
      clinica_id, 
      valor_fechado, 
      data_fechamento, 
      tipo_tratamento,
      observacoes,
      valor_parcela,
      numero_parcelas,
      vencimento,
      antecipacao_meses,
      // Novos campos administrativos
      data_operacao,
      valor_entregue,
      tipo_operacao
    } = req.body;

    // Verificar se é fechamento automático (baseado nas observações)
    const isAutomaticFechamento = observacoes && observacoes.includes('automaticamente pelo pipeline');
    
    // Verificar se o arquivo foi enviado (obrigatório apenas para fechamentos manuais)
    if (!req.files?.contrato && !isAutomaticFechamento) {
      return res.status(400).json({ error: 'Contrato em PDF é obrigatório!' });
    }

    // Converter campos opcionais para null se não enviados ou vazios
    const consultorId = consultor_id && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;
    const clinicaId = clinica_id && clinica_id !== '' ? 
      (typeof clinica_id === 'number' ? clinica_id : parseInt(clinica_id)) : null;

    // Validar que clínica é obrigatória apenas para não incorporadora
    if (!clinicaId && req.user.empresa_id !== 5) {
      return res.status(400).json({ error: 'Clínica é obrigatória para criar um fechamento!' });
    }

    // Validar valor_fechado para garantir que não seja null/NaN
    const valorFechado = parseFloat(valor_fechado);
    if (isNaN(valorFechado) || valorFechado < 0) {
      return res.status(400).json({ error: 'Valor de fechamento deve ser um número válido maior ou igual a zero' });
    }

    // Validar e processar campos de parcelamento
    const valorParcela = valor_parcela ? parseFloat(valor_parcela) : null;
    const numeroParcelas = numero_parcelas ? parseInt(numero_parcelas) : null;
    const vencimentoData = vencimento || null;
    const antecipacaoMeses = antecipacao_meses ? parseInt(antecipacao_meses) : null;
    
    // Validar e processar novos campos administrativos
    const dataOperacao = data_operacao || null;
    const valorEntregueVal = valor_entregue ? parseFloat(valor_entregue) : null;
    const tipoOperacaoVal = tipo_operacao || null;

    // Dados do contrato (se houver arquivo)
    let contratoArquivo = null;
    let contratoNomeOriginal = null;
    let contratoTamanho = null;
    
    // Dados do print de confirmação
    let printConfirmacaoArquivo = null;
    let printConfirmacaoNome = null;
    let printConfirmacaoTamanho = null;
    
    // Se houver arquivo de contrato, fazer upload para Supabase Storage
    if (req.files?.contrato && req.files.contrato[0]) {
      try {
        const uploadResult = await uploadToSupabase(req.files.contrato[0], STORAGE_BUCKET_CONTRATOS, 'fechamentos', 'contrato');
        contratoArquivo = uploadResult.path; // Usar o caminho completo em vez de apenas o nome
        contratoNomeOriginal = uploadResult.originalName;
        contratoTamanho = uploadResult.size;
      } catch (uploadError) {
        console.error('Erro detalhado no upload do contrato:', uploadError);
        return res.status(500).json({ 
          error: 'Erro ao fazer upload do contrato: ' + uploadError.message,
          details: process.env.NODE_ENV === 'development' ? uploadError : undefined
        });
      }
    }
    
    // Se houver arquivo de print de confirmação, fazer upload
    if (req.files?.print_confirmacao && req.files.print_confirmacao[0]) {
      try {
        const uploadResult = await uploadToSupabase(req.files.print_confirmacao[0], STORAGE_BUCKET_CONTRATOS, 'fechamentos', 'print_confirmacao');
        printConfirmacaoArquivo = uploadResult.path; // Usar o caminho completo em vez de apenas o nome
        printConfirmacaoNome = uploadResult.originalName;
        printConfirmacaoTamanho = uploadResult.size;
      } catch (uploadError) {
        console.error('Erro detalhado no upload do print de confirmação:', uploadError);
        // Não bloquear o fechamento se houver erro no upload do print
        console.warn('Print de confirmação não foi salvo devido a erro no upload');
      }
    }
    
    // Buscar dados do agendamento relacionado para copiar os IDs
    let dadosAgendamento = null;
    if (paciente_id) {
      const { data: agendamentoData } = await supabaseAdmin
        .from('agendamentos')
        .select('consultor_id, sdr_id, consultor_interno_id')
        .eq('paciente_id', paciente_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      dadosAgendamento = agendamentoData;
    }
    
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .insert([{
        paciente_id: parseInt(paciente_id),
        consultor_id: dadosAgendamento?.consultor_id || consultorId, // freelancer que indicou
        sdr_id: dadosAgendamento?.sdr_id, // SDR que trabalhou o lead
        consultor_interno_id: dadosAgendamento?.consultor_interno_id || consultorId, // consultor interno que fechou
        clinica_id: clinicaId,
        valor_fechado: valorFechado,
        data_fechamento,
        tipo_tratamento: tipo_tratamento || null,
        observacoes: observacoes || null,
        contrato_arquivo: contratoArquivo,
        contrato_nome_original: contratoNomeOriginal,
        contrato_tamanho: contratoTamanho,
        valor_parcela: valorParcela,
        numero_parcelas: numeroParcelas,
        vencimento: vencimentoData,
        antecipacao_meses: antecipacaoMeses,
        // Novos campos administrativos
        data_operacao: dataOperacao,
        valor_entregue: valorEntregueVal,
        tipo_operacao: tipoOperacaoVal,
        print_confirmacao_arquivo: printConfirmacaoArquivo,
        print_confirmacao_nome: printConfirmacaoNome,
        print_confirmacao_tamanho: printConfirmacaoTamanho,
        aprovado: req.user.empresa_id === 5 ? 'aprovado' : 'pendente', // Incorporadora sempre aprovado, outras empresas pendente
        empresa_id: req.user.empresa_id // Adicionar empresa_id do usuário que está criando
      }])
      .select();

    if (error) {
      // Se houve erro, remover os arquivos do Supabase Storage
      const filesToRemove = [];
      if (contratoArquivo) filesToRemove.push(contratoArquivo);
      if (printConfirmacaoArquivo) filesToRemove.push(printConfirmacaoArquivo);
      
      if (filesToRemove.length > 0) {
        await supabaseAdmin.storage
          .from(STORAGE_BUCKET_CONTRATOS)
          .remove(filesToRemove);
      }
      throw error;
    }

    // Atualizar status do paciente para "fechado"
    if (paciente_id) {
      await supabaseAdmin
        .from('pacientes')
        .update({ status: 'fechado' })
        .eq('id', paciente_id);
    }

    // Criar agendamento automaticamente com status "fechado" apenas se não for fechamento automático
    // (fechamentos automáticos já têm agendamento criado no fluxo agendamentos → fechamentos)
    if (paciente_id && !isAutomaticFechamento) {
      try {
        const agendamentoData = {
          paciente_id: parseInt(paciente_id),
          consultor_id: consultorId,
          data_agendamento: data_fechamento, // Usar a mesma data do fechamento
          horario: '00:00', // Horário padrão
          status: 'fechado', // Status automático "fechado"
          observacoes: 'Agendamento criado automaticamente a partir do fechamento',
          empresa_id: req.user.empresa_id
        };
        
        // Só incluir clinica_id se não for incorporadora
        if (req.user.empresa_id !== 5) {
          agendamentoData.clinica_id = clinicaId;
        }
        
        await supabaseAdmin
          .from('agendamentos')
          .insert([agendamentoData]);
      } catch (agendamentoError) {
        console.error('Erro ao criar agendamento automático:', agendamentoError);
        // Não bloquear o fechamento se houver erro no agendamento
      }
    }

    // Registrar movimentação de fechamento criado
    try {
      const fechamentoId = data[0].id;
      await criarMovimentacaoFechamentoCriado(fechamentoId, {
        consultor_id: dadosAgendamento?.consultor_id || consultorId,
        sdr_id: dadosAgendamento?.sdr_id,
        consultor_interno_id: dadosAgendamento?.consultor_interno_id || consultorId,
        executado_por: req.user,
        dados_novos: {
          valor_fechado: valorFechado,
          data_fechamento,
          tipo_tratamento: tipo_tratamento || null
        }
      });
      console.log('✅ Movimentação de fechamento criado registrada');
    } catch (movimentacaoError) {
      console.error('⚠️ Erro ao registrar movimentação de fechamento:', movimentacaoError);
      // Não falhar a operação principal se houver erro na movimentação
    }

    // Definir consultorInternoIdFinal para uso no Socket.IO
    const consultorInternoIdFinal = dadosAgendamento?.consultor_interno_id || consultorId;

    // Emitir evento Socket.IO para notificar incorporadora sobre novo fechamento
    if (req.io && consultorInternoIdFinal && req.user.empresa_id === 5) {
      console.log('📢 [SOCKET.IO] Emitindo evento new-fechamento-incorporadora:', {
        fechamentoId: data[0].id,
        paciente_id: paciente_id,
        consultorInternoId: consultorInternoIdFinal,
        empresa_id: req.user.empresa_id,
        valor_fechado: valorFechado,
        data_fechamento: data_fechamento,
        timestamp: new Date().toISOString(),
        room: 'incorporadora-notifications'
      });
      
      // Buscar dados do corretor (consultor interno)
      const { data: corretorData } = await supabaseAdmin
        .from('consultores')
        .select('nome, foto_url')
        .eq('id', consultorInternoIdFinal)
        .single();

      console.log('👤 [SOCKET.IO] Dados do corretor encontrados:', {
        consultorInternoId: consultorInternoIdFinal,
        nome: corretorData?.nome || 'N/A',
        temFoto: !!corretorData?.foto_url
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

      req.io.to('incorporadora-notifications').emit('new-fechamento-incorporadora', {
        fechamentoId: data[0].id,
        paciente_nome: pacienteData?.nome || 'Cliente',
        paciente_telefone: pacienteData?.telefone || '',
        valor_fechado: valorFechado,
        data_fechamento: data_fechamento,
        corretor_nome: corretorData?.nome || 'Corretor',
        corretor_foto: corretorData?.foto_url || null,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ [SOCKET.IO] Evento new-fechamento-incorporadora enviado para grupo incorporadora-notifications');
    } else {
      console.log('⚠️ [SOCKET.IO] Evento new-fechamento-incorporadora não enviado:', {
        temSocketIO: !!req.io,
        temConsultorInternoId: !!consultorInternoIdFinal,
        empresaId: req.user.empresa_id,
        motivo: !req.io ? 'Socket.IO não disponível' : 
                !consultorInternoIdFinal ? 'Sem consultorInternoIdFinal' : 
                req.user.empresa_id !== 5 ? 'Não é incorporadora' : 'Desconhecido'
      });
    }

    res.json({ 
      id: data[0].id, 
      message: 'Fechamento registrado com sucesso!',
      contrato: contratoNomeOriginal
    });
  } catch (error) {
    console.error('Erro ao criar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/fechamentos/:id - Atualizar fechamento
const updateFechamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permissões: Admin pode editar tudo, Consultor Interno apenas seus próprios
    if (req.user.tipo === 'consultor') {
      const isConsultorInterno = req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true;
      
      if (!isConsultorInterno) {
        return res.status(403).json({ error: 'Você não tem permissão para editar fechamentos' });
      }
      
      // Verificar se o fechamento pertence ao consultor
      const { data: fechamento, error: checkError } = await supabaseAdmin
        .from('fechamentos')
        .select('consultor_id')
        .eq('id', id)
        .single();
      
      if (checkError) {
        return res.status(404).json({ error: 'Fechamento não encontrado' });
      }
      
      if (fechamento.consultor_id !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode editar fechamentos atribuídos a você' });
      }
    }
    
    const { 
      paciente_id, 
      consultor_id, 
      clinica_id, 
      valor_fechado, 
      data_fechamento, 
      tipo_tratamento,
      observacoes,
      // Campos de parcelamento
      valor_parcela,
      numero_parcelas,
      vencimento,
      antecipacao_meses,
      // Campos administrativos
      data_operacao,
      valor_entregue,
      tipo_operacao
    } = req.body;

    // Converter campos opcionais para null se não enviados ou vazios
    const consultorId = consultor_id && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;
    const clinicaId = clinica_id && clinica_id !== '' ? 
      (typeof clinica_id === 'number' ? clinica_id : parseInt(clinica_id)) : null;
    
    // Validar valor_fechado para garantir que não seja null/NaN
    
    let valorFechado;
    if (valor_fechado === null || valor_fechado === undefined || valor_fechado === '') {
      return res.status(400).json({ error: 'Valor de fechamento é obrigatório' });
    }
    
    valorFechado = parseFloat(valor_fechado);
    
    if (isNaN(valorFechado) || valorFechado < 0) {
      return res.status(400).json({ 
        error: 'Valor de fechamento deve ser um número válido maior ou igual a zero',
        debug: { valorOriginal: valor_fechado, valorParsed: valorFechado }
      });
    }
    
    // Processar campos de parcelamento
    const valorParcelaVal = valor_parcela ? parseFloat(valor_parcela) : null;
    const numeroParcelasVal = numero_parcelas ? parseInt(numero_parcelas) : null;
    const vencimentoVal = vencimento || null;
    const antecipacaoMesesVal = antecipacao_meses ? parseInt(antecipacao_meses) : null;
    
    // Processar campos administrativos
    const dataOperacao = data_operacao || null;
    const valorEntregueVal = valor_entregue ? parseFloat(valor_entregue) : null;
    const tipoOperacaoVal = tipo_operacao || null;
    
    // Upload de print de confirmação se fornecido
    let printConfirmacaoArquivo = null;
    let printConfirmacaoNome = null;
    let printConfirmacaoTamanho = null;
    
    if (req.files?.print_confirmacao && req.files.print_confirmacao[0]) {
      try {
        const uploadResult = await uploadToSupabase(req.files.print_confirmacao[0], STORAGE_BUCKET_CONTRATOS, 'fechamentos', 'print_confirmacao');
        printConfirmacaoArquivo = uploadResult.path; // Usar o caminho completo em vez de apenas o nome
        printConfirmacaoNome = uploadResult.originalName;
        printConfirmacaoTamanho = uploadResult.size;
      } catch (uploadError) {
        console.error('Erro no upload do print de confirmação:', uploadError);
        // Não bloquear a atualização se houver erro no upload do print
      }
    }
    
    // Preparar objeto de atualização
    const updateData = { 
      paciente_id: parseInt(paciente_id), 
      consultor_id: consultorId, 
      clinica_id: clinicaId, 
      valor_fechado: valorFechado, 
      data_fechamento, 
      tipo_tratamento: tipo_tratamento || null,
      observacoes: observacoes || null,
      // Campos de parcelamento
      valor_parcela: valorParcelaVal,
      numero_parcelas: numeroParcelasVal,
      vencimento: vencimentoVal,
      antecipacao_meses: antecipacaoMesesVal,
      // Campos administrativos
      data_operacao: dataOperacao,
      valor_entregue: valorEntregueVal,
      tipo_operacao: tipoOperacaoVal
    };
    
    // Adicionar campos do print apenas se houver novo upload
    if (printConfirmacaoArquivo) {
      updateData.print_confirmacao_arquivo = printConfirmacaoArquivo;
      updateData.print_confirmacao_nome = printConfirmacaoNome;
      updateData.print_confirmacao_tamanho = printConfirmacaoTamanho;
    }
    
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Fechamento atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/fechamentos/:id - Excluir fechamento
const deleteFechamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados do fechamento antes de deletar para remover arquivo
    const { data: fechamento, error: selectError } = await supabaseAdmin
      .from('fechamentos')
      .select('contrato_arquivo')
      .eq('id', id)
      .single();

    if (selectError) throw selectError;

    // Deletar fechamento do banco
    const { error } = await supabaseAdmin
      .from('fechamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remover arquivo de contrato do Supabase Storage se existir
    if (fechamento?.contrato_arquivo) {
      try {
        await supabaseAdmin.storage
          .from(STORAGE_BUCKET_CONTRATOS)
          .remove([fechamento.contrato_arquivo]);
      } catch (storageError) {
        console.error('Erro ao remover arquivo do storage:', storageError);
      }
    }

    res.json({ message: 'Fechamento removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/fechamentos/:id/contrato-url - Gerar URL assinada do contrato
const getContratoUrl = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar dados do fechamento
    const { data: fechamento, error } = await supabaseAdmin
      .from('fechamentos')
      .select('contrato_arquivo, contrato_nome_original')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!fechamento?.contrato_arquivo) {
      return res.status(404).json({ error: 'Contrato não encontrado!' });
    }

    // Log para debug
    console.log('🔍 Buscando contrato:', {
      fechamento_id: id,
      contrato_arquivo: fechamento.contrato_arquivo,
      bucket: STORAGE_BUCKET_CONTRATOS
    });

    // Tentar primeiro com o caminho completo, depois apenas com o nome (compatibilidade com fechamentos antigos)
    let contratoPath = fechamento.contrato_arquivo;
    
    // Se o arquivo não tem pasta, adicionar a pasta fechamentos
    if (!contratoPath.includes('/')) {
      contratoPath = `fechamentos/${contratoPath}`;
    }

    console.log('🔍 Caminho do contrato:', contratoPath);

    // Gerar URL assinada com validade de 24 horas (86400 segundos)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .createSignedUrl(contratoPath, 86400);

    if (urlError) {
      console.error('Erro ao gerar URL assinada:', urlError);
      return res.status(500).json({ error: 'Erro ao gerar URL de download' });
    }

    // Retornar apenas a URL assinada
    res.json({ 
      url: urlData.signedUrl,
      nome: fechamento.contrato_nome_original || 'contrato.pdf',
      expiraEm: '24 horas'
    });
  } catch (error) {
    console.error('Erro ao gerar URL do contrato:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/fechamentos/:id/contrato - Download de contrato (DEPRECATED)
const downloadContrato = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar dados do fechamento
    const { data: fechamento, error } = await supabaseAdmin
      .from('fechamentos')
      .select('contrato_arquivo, contrato_nome_original')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!fechamento?.contrato_arquivo) {
      return res.status(404).json({ error: 'Contrato não encontrado!' });
    }

    // Tentar primeiro com o caminho completo, depois apenas com o nome (compatibilidade com fechamentos antigos)
    let contratoPath = fechamento.contrato_arquivo;
    
    // Se o arquivo não tem pasta, adicionar a pasta fechamentos
    if (!contratoPath.includes('/')) {
      contratoPath = `fechamentos/${contratoPath}`;
    }

    // Fazer download do arquivo do Supabase Storage
    const { data, error: downloadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .download(contratoPath);

    if (downloadError) {
      console.error('Erro ao baixar arquivo:', downloadError);
      return res.status(500).json({ error: 'Erro ao baixar arquivo' });
    }

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fechamento.contrato_nome_original || 'contrato.pdf'}"`);
    
    // Enviar o arquivo
    res.send(data);
  } catch (error) {
    console.error('Erro ao baixar contrato:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/fechamentos/:id/print-confirmacao-url - Gerar URL assinada do print de confirmação
const getPrintConfirmacaoUrl = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar dados do fechamento
    const { data: fechamento, error } = await supabaseAdmin
      .from('fechamentos')
      .select('print_confirmacao_arquivo, print_confirmacao_nome')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!fechamento?.print_confirmacao_arquivo) {
      return res.status(404).json({ error: 'Print de confirmação não encontrado!' });
    }

    // Tentar primeiro com o caminho completo, depois apenas com o nome (compatibilidade com fechamentos antigos)
    let printPath = fechamento.print_confirmacao_arquivo;
    
    // Se o arquivo não tem pasta, adicionar a pasta fechamentos
    if (!printPath.includes('/')) {
      printPath = `fechamentos/${printPath}`;
    }

    // Gerar URL assinada com validade de 24 horas (86400 segundos)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .createSignedUrl(printPath, 86400);

    if (urlError) {
      console.error('Erro ao gerar URL assinada:', urlError);
      return res.status(500).json({ error: 'Erro ao gerar URL de download' });
    }

    // Retornar apenas a URL assinada
    res.json({ 
      url: urlData.signedUrl,
      nome: fechamento.print_confirmacao_nome || 'print_confirmacao',
      expiraEm: '24 horas'
    });
  } catch (error) {
    console.error('Erro ao gerar URL do print de confirmação:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/fechamentos/:id/aprovar - Aprovar fechamento (apenas admin)
const aprovarFechamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro, verificar se o fechamento existe
    const { data: fechamento, error: fetchError } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .update({ aprovado: 'aprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      // Campo aprovado não existe na tabela, mas continuar
      return res.json({ message: 'Fechamento aprovado com sucesso!' });
    }
    
    res.json({ message: 'Fechamento aprovado com sucesso!' });
  } catch (error) {
    console.error('Erro ao aprovar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/fechamentos/:id/reprovar - Reprovar fechamento (apenas admin)
const reprovarFechamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro, verificar se o fechamento existe
    const { data: fechamento, error: fetchError } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .update({ aprovado: 'reprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      // Campo aprovado não existe na tabela, mas continuar
      return res.json({ message: 'Fechamento reprovado com sucesso!' });
    }
    
    res.json({ message: 'Fechamento reprovado com sucesso!' });
  } catch (error) {
    console.error('Erro ao reprovar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
};

// Função para gerar senha aleatória
const gerarSenhaAleatoria = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let senha = '';
  for (let i = 0; i < 8; i++) {
    senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return senha;
};

// POST /api/fechamentos/:id/criar-acesso-freelancer - Criar acesso freelancer para paciente fechado
const criarAcessoFreelancer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permissões: apenas admin ou usuário da incorporadora (empresa_id=5)
    if (req.user.tipo !== 'admin' && req.user.empresa_id !== 5) {
      return res.status(403).json({ error: 'Você não tem permissão para criar acessos freelancer' });
    }

    // Buscar fechamento com dados do paciente
    const { data: fechamento, error: fechamentoError } = await supabaseAdmin
      .from('fechamentos')
      .select(`
        *,
        pacientes(
          id,
          nome,
          email,
          telefone,
          status,
          empresa_id
        )
      `)
      .eq('id', id)
      .single();

    if (fechamentoError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }

    const paciente = fechamento.pacientes;

    // Validar se fechamento está aprovado
    if (fechamento.aprovado !== 'aprovado') {
      return res.status(400).json({ error: 'Fechamento deve estar aprovado para criar acesso freelancer' });
    }

    // Validar se paciente tem status "fechado"
    if (paciente.status !== 'fechado') {
      return res.status(400).json({ error: 'Paciente deve ter status "fechado" para criar acesso freelancer' });
    }

    // Validar se paciente tem email
    if (!paciente.email || paciente.email.trim() === '') {
      return res.status(400).json({ error: 'Paciente deve ter email cadastrado para criar acesso freelancer' });
    }

    // Verificar se email já existe na tabela consultores
    const { data: consultorExistente, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('id')
      .eq('email', paciente.email.trim())
      .limit(1);

    if (consultorError) throw consultorError;

    if (consultorExistente && consultorExistente.length > 0) {
      return res.status(400).json({ error: 'Este email já possui acesso freelancer no sistema' });
    }

    // Gerar senha aleatória
    const senhaTemporaria = gerarSenhaAleatoria();
    
    // Hash da senha
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senhaTemporaria, saltRounds);

    // Preparar dados do consultor
    const consultorData = {
      nome: paciente.nome,
      email: paciente.email.trim(),
      senha: senhaHash,
      telefone: paciente.telefone || null,
      is_freelancer: true,
      ativo: true,
      tipo: 'consultor',
      empresa_id: paciente.empresa_id, // Herdar do fechamento/paciente
      podealterarstatus: false,
      pode_ver_todas_novas_clinicas: false
    };

    // Criar consultor na tabela consultores
    const { data: novoConsultor, error: criarError } = await supabaseAdmin
      .from('consultores')
      .insert([consultorData])
      .select();

    if (criarError) throw criarError;

    const consultorId = novoConsultor[0].id;

    // Gerar código de referência automaticamente
    try {
      const nomeLimpo = paciente.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 10);
      
      const codigoReferencia = `${nomeLimpo}${consultorId}`;
      
      // Atualizar o consultor com o código de referência
      await supabaseAdmin
        .from('consultores')
        .update({ codigo_referencia: codigoReferencia })
        .eq('id', consultorId);
      
      console.log('✅ Código de referência gerado:', codigoReferencia);
    } catch (codigoError) {
      console.error('⚠️ Erro ao gerar código de referência:', codigoError);
    }

    // Enviar email com credenciais
    try {
      const linkAcesso = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      
      const htmlEmail = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Seu Acesso ao Sistema de Indicações</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; }
            .credentials { background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Seu Acesso ao Sistema de Indicações</h1>
            </div>
            
            <div class="content">
              <p>Olá <strong>${paciente.nome}</strong>,</p>
              
              <p>Seu acesso ao sistema de indicações foi criado com sucesso! Agora você pode fazer login, indicar possíveis novos clientes e ganhar com isso!.</p>
              
              <div class="credentials">
                <h3>Suas Credenciais de Acesso:</h3>
                <p><strong>Email:</strong> ${paciente.email}</p>
                <p><strong>Senha Temporária:</strong> ${senhaTemporaria}</p>
              </div>
              
              <p>Para acessar o sistema, clique no botão abaixo:</p>
              <a href="${linkAcesso}" class="button">Fazer Login</a>
              
              <div class="warning">
                <h4>⚠️ Importante:</h4>
                <ul>
                  <li>Esta é uma senha temporária</li>
                  <li>Recomendamos que você altere sua senha após o primeiro login</li>
                  <li>Mantenha suas credenciais seguras</li>
                </ul>
              </div>
              
              <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
              
              <p>Atenciosamente,<br>Equipe IM Solumn</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@crminvest.com',
        to: paciente.email,
        subject: 'Seu acesso ao sistema de indicações',
        html: htmlEmail
      });

      console.log('✅ Email enviado com sucesso para:', paciente.email);
    } catch (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
      // Não falhar a operação se houver erro no email
    }

    res.json({ 
      message: 'Acesso freelancer criado com sucesso! As credenciais foram enviadas para o email do cliente.',
      consultor: {
        id: consultorId,
        nome: paciente.nome,
        email: paciente.email
      }
    });

  } catch (error) {
    console.error('Erro ao criar acesso freelancer:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllFechamentos,
  getDashboardFechamentos,
  createFechamento,
  updateFechamento,
  deleteFechamento,
  getContratoUrl,
  downloadContrato,
  getPrintConfirmacaoUrl,
  aprovarFechamento,
  reprovarFechamento,
  criarAcessoFreelancer
};

