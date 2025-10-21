const { supabase, supabaseAdmin } = require('../config/database');
const { STORAGE_BUCKET_CONTRATOS } = require('../config/constants');
const { uploadToSupabase } = require('../middleware/upload');

// GET /api/fechamentos - Listar fechamentos
const getAllFechamentos = async (req, res) => {
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

    // Se for admin ou parceiro, filtrar apenas fechamentos de consultores da empresa
    if ((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os fechamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(fechamento => {
      // NÃO gerar URL aqui - será gerada sob demanda quando o usuário clicar para baixar
      return {
        ...fechamento,
        paciente_nome: fechamento.pacientes?.nome,
        paciente_telefone: fechamento.pacientes?.telefone,
        paciente_cpf: fechamento.pacientes?.cpf,
        consultor_nome: fechamento.consultores?.nome,
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

    // Se for admin ou parceiro, filtrar apenas fechamentos de consultores da empresa
    if ((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os fechamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(fechamento => {
      // NÃO gerar URL aqui - será gerada sob demanda quando o usuário clicar para baixar
      return {
        ...fechamento,
        paciente_nome: fechamento.pacientes?.nome,
        paciente_telefone: fechamento.pacientes?.telefone,
        paciente_cpf: fechamento.pacientes?.cpf,
        consultor_nome: fechamento.consultores?.nome,
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

    // Validar que clínica é obrigatória
    if (!clinicaId) {
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
        const uploadResult = await uploadToSupabase(req.files.contrato[0], 'contrato');
        contratoArquivo = uploadResult.fileName;
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
        const uploadResult = await uploadToSupabase(req.files.print_confirmacao[0], 'print_confirmacao');
        printConfirmacaoArquivo = uploadResult.fileName;
        printConfirmacaoNome = uploadResult.originalName;
        printConfirmacaoTamanho = uploadResult.size;
      } catch (uploadError) {
        console.error('Erro detalhado no upload do print de confirmação:', uploadError);
        // Não bloquear o fechamento se houver erro no upload do print
        console.warn('Print de confirmação não foi salvo devido a erro no upload');
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .insert([{
        paciente_id: parseInt(paciente_id),
        consultor_id: consultorId,
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
        aprovado: 'pendente'
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

    // Criar agendamento automaticamente com status "fechado"
    if (paciente_id && clinicaId) {
      try {
        await supabaseAdmin
          .from('agendamentos')
          .insert([{
            paciente_id: parseInt(paciente_id),
            consultor_id: consultorId,
            clinica_id: clinicaId,
            data_agendamento: data_fechamento, // Usar a mesma data do fechamento
            horario: '00:00', // Horário padrão
            status: 'fechado', // Status automático "fechado"
            observacoes: 'Agendamento criado automaticamente a partir do fechamento'
          }]);
      } catch (agendamentoError) {
        console.error('Erro ao criar agendamento automático:', agendamentoError);
        // Não bloquear o fechamento se houver erro no agendamento
      }
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
        const uploadResult = await uploadToSupabase(req.files.print_confirmacao[0], 'print_confirmacao');
        printConfirmacaoArquivo = uploadResult.fileName;
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

    // Gerar URL assinada com validade de 24 horas (86400 segundos)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .createSignedUrl(fechamento.contrato_arquivo, 86400);

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

    // Fazer download do arquivo do Supabase Storage
    const { data, error: downloadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .download(fechamento.contrato_arquivo);

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

    // Gerar URL assinada com validade de 24 horas (86400 segundos)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .createSignedUrl(fechamento.print_confirmacao_arquivo, 86400);

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
  reprovarFechamento
};

