const { supabaseAdmin } = require('../config/database');
const { criarBoletosCaixa } = require('../utils/caixa-boletos.helper');
const { STORAGE_BUCKET_DOCUMENTOS } = require('../config/constants');
const { uploadToSupabase } = require('../middleware/upload');

// GET /api/boletos-gestao - Listar boletos com filtros
const listarBoletos = async (req, res) => {
  try {
    console.log('🔍 [LISTAR BOLETOS] Iniciando listagem de boletos');
    console.log('🔍 [LISTAR BOLETOS] Query params:', req.query);
    console.log('🔍 [LISTAR BOLETOS] User:', req.user ? { id: req.user.id, tipo: req.user.tipo, empresa_id: req.user.empresa_id } : 'NÃO DEFINIDO');
    
    // Verificar se req.user existe (deve existir devido ao authenticateToken, mas vamos garantir)
    if (!req.user) {
      console.error('❌ [LISTAR BOLETOS] req.user não está definido!');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const { 
      fechamento_id, 
      paciente_id, 
      clinica_id,
      status,
      vencimento_de,
      vencimento_ate,
      gerar_boleto,
      boleto_gerado,
      page = 1,
      limit = 50
    } = req.query;

    // Verificar se a tabela existe primeiro
    let tabelaExiste = false;
    try {
      const { count, error: checkError } = await supabaseAdmin
        .from('boletos_gestao')
        .select('*', { count: 'exact', head: true });
      
      if (checkError) {
        console.error('❌ [LISTAR BOLETOS] Erro ao verificar tabela:', checkError);
        if (checkError.code === 'PGRST205' || checkError.message?.includes('does not exist')) {
          console.warn('⚠️ [LISTAR BOLETOS] Tabela boletos_gestao não existe ainda. Retornando lista vazia.');
          return res.json({
            boletos: [],
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0
          });
        }
        throw checkError;
      }
      
      tabelaExiste = true;
      console.log(`📊 [LISTAR BOLETOS] Total de boletos na tabela: ${count || 0}`);
    } catch (debugError) {
      console.error('❌ [LISTAR BOLETOS] Erro ao verificar tabela:', debugError);
      if (debugError.code === 'PGRST205' || debugError.message?.includes('does not exist')) {
        console.warn('⚠️ [LISTAR BOLETOS] Tabela boletos_gestao não existe. Retornando lista vazia.');
        return res.json({
          boletos: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0
        });
      }
      throw debugError;
    }

    // Buscar diretamente da tabela (mais confiável que a view)
    const offset = (page - 1) * limit;
    
    let tableQuery = supabaseAdmin
      .from('boletos_gestao')
      .select(`
        *,
        pacientes(nome, cpf, telefone),
        clinicas(nome, cnpj),
        fechamentos(valor_fechado, numero_parcelas, data_fechamento)
      `, { count: 'exact' });

    // Aplicar filtros
    if (fechamento_id) tableQuery = tableQuery.eq('fechamento_id', fechamento_id);
    if (paciente_id) tableQuery = tableQuery.eq('paciente_id', paciente_id);
    if (clinica_id) tableQuery = tableQuery.eq('clinica_id', clinica_id);
    if (status) tableQuery = tableQuery.eq('status', status);
    if (gerar_boleto !== undefined) tableQuery = tableQuery.eq('gerar_boleto', gerar_boleto === 'true');
    if (boleto_gerado !== undefined) tableQuery = tableQuery.eq('boleto_gerado', boleto_gerado === 'true');
    if (vencimento_de) tableQuery = tableQuery.gte('data_vencimento', vencimento_de);
    if (vencimento_ate) tableQuery = tableQuery.lte('data_vencimento', vencimento_ate);
    if (req.user.tipo !== 'admin' && req.user.empresa_id) {
      tableQuery = tableQuery.eq('empresa_id', req.user.empresa_id);
    }

    tableQuery = tableQuery
      .order('data_vencimento', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const tableResult = await tableQuery;
    
    if (tableResult.error) {
      console.error('❌ [LISTAR BOLETOS] Erro na query da tabela:', tableResult.error);
      console.error('❌ [LISTAR BOLETOS] Detalhes do erro:', JSON.stringify(tableResult.error, null, 2));
      
      // Se o erro for relacionado à tabela não existir, tentar buscar sem joins
      if (tableResult.error.code === 'PGRST205' || tableResult.error.message?.includes('does not exist')) {
        console.log('⚠️ [LISTAR BOLETOS] Tabela ou relacionamentos não encontrados. Tentando buscar sem joins...');
        
        let simpleQuery = supabaseAdmin
          .from('boletos_gestao')
          .select('*', { count: 'exact' });
        
        // Aplicar filtros básicos
        if (fechamento_id) simpleQuery = simpleQuery.eq('fechamento_id', fechamento_id);
        if (paciente_id) simpleQuery = simpleQuery.eq('paciente_id', paciente_id);
        if (status) simpleQuery = simpleQuery.eq('status', status);
        
        simpleQuery = simpleQuery
          .order('data_vencimento', { ascending: true })
          .range(offset, offset + limit - 1);
        
        const simpleResult = await simpleQuery;
        
        if (simpleResult.error) {
          throw simpleResult.error;
        }
        
        // Retornar dados simples sem joins
        res.json({
          boletos: simpleResult.data || [],
          total: simpleResult.count || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((simpleResult.count || 0) / limit)
        });
        return;
      }
      
      throw tableResult.error;
    }

    // Transformar os dados para o formato esperado
    // O Supabase pode retornar relacionamentos como arrays ou objetos
    const data = (tableResult.data || []).map(bg => {
      // Extrair dados dos relacionamentos (pode ser array ou objeto)
      const paciente = Array.isArray(bg.pacientes) ? bg.pacientes[0] : bg.pacientes;
      const clinica = Array.isArray(bg.clinicas) ? bg.clinicas[0] : bg.clinicas;
      const fechamento = Array.isArray(bg.fechamentos) ? bg.fechamentos[0] : bg.fechamentos;
      
      return {
        ...bg,
        paciente_nome: paciente?.nome || null,
        paciente_cpf: paciente?.cpf || null,
        paciente_telefone: paciente?.telefone || null,
        clinica_nome: clinica?.nome || null,
        clinica_cnpj: clinica?.cnpj || null,
        valor_fechado: fechamento?.valor_fechado || null,
        total_parcelas: fechamento?.numero_parcelas || null,
        data_fechamento: fechamento?.data_fechamento || null,
        deve_gerar_hoje: bg.gerar_boleto === true && bg.boleto_gerado === false && 
          new Date(bg.data_vencimento) <= new Date(Date.now() + (bg.dias_antes_vencimento || 20) * 24 * 60 * 60 * 1000),
        dias_ate_vencimento: Math.ceil((new Date(bg.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24)),
        status_display: bg.status === 'pago' ? 'Pago' : 
          bg.status === 'cancelado' ? 'Cancelado' :
          new Date(bg.data_vencimento) < new Date() && bg.status !== 'pago' ? 'Vencido' : 'Pendente',
        pacientes: undefined,
        clinicas: undefined,
        fechamentos: undefined
      };
    });
    
    const count = tableResult.count || 0;
    console.log('✅ [LISTAR BOLETOS] Dados recuperados diretamente da tabela');

    console.log(`📊 [LISTAR BOLETOS] Total encontrado: ${count || 0}, Retornando: ${data?.length || 0} boletos`);
    if (data && data.length > 0) {
      console.log(`📊 [LISTAR BOLETOS] Primeiro boleto:`, {
        id: data[0].id,
        paciente_id: data[0].paciente_id,
        paciente_nome: data[0].paciente_nome,
        fechamento_id: data[0].fechamento_id,
        clinica_id: data[0].clinica_id,
        status: data[0].status
      });
    } else {
      console.log('ℹ️ [LISTAR BOLETOS] Nenhum boleto encontrado');
    }

    res.json({
      boletos: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('❌ [LISTAR BOLETOS] Erro ao listar boletos:', error);
    console.error('❌ [LISTAR BOLETOS] Stack trace:', error.stack);
    res.status(500).json({ error: error.message || 'Erro ao listar boletos' });
  }
};

// POST /api/boletos-gestao/importar - Importar boletos de um fechamento
const importarBoletos = async (req, res) => {
  try {
    const { 
      fechamento_id,
      gerar_automatico = false,
      dias_antes_vencimento = 20,
      parcelas // Array opcional de parcelas customizadas
    } = req.body;

    if (!fechamento_id) {
      return res.status(400).json({ error: 'fechamento_id é obrigatório' });
    }

    // Verificar se o fechamento existe
    const { data: fechamento, error: fechamentoError } = await supabaseAdmin
      .from('fechamentos')
      .select('*, pacientes(nome, cpf)')
      .eq('id', fechamento_id)
      .single();

    if (fechamentoError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }

    // Verificar se já existem boletos para este fechamento
    const { count: boletosExistentes } = await supabaseAdmin
      .from('boletos_gestao')
      .select('*', { count: 'exact', head: true })
      .eq('fechamento_id', fechamento_id);

    if (boletosExistentes > 0) {
      return res.status(400).json({ 
        error: 'Já existem boletos importados para este fechamento',
        boletos_existentes: boletosExistentes
      });
    }

    let boletosParaCriar = [];

    if (parcelas && Array.isArray(parcelas)) {
      // Usar parcelas customizadas fornecidas
      boletosParaCriar = parcelas.map((p, index) => ({
        fechamento_id,
        paciente_id: fechamento.paciente_id,
        clinica_id: fechamento.clinica_id,
        empresa_id: fechamento.empresa_id,
        numero_parcela: p.numero_parcela || (index + 1),
        valor: p.valor || fechamento.valor_parcela,
        data_vencimento: p.data_vencimento,
        gerar_boleto: p.gerar_boleto !== undefined ? p.gerar_boleto : gerar_automatico,
        dias_antes_vencimento: p.dias_antes_vencimento || dias_antes_vencimento,
        importado_por: req.user.id,
        status: 'pendente'
      }));
    } else {
      // Criar parcelas baseadas no fechamento
      const dataVencimentoInicial = fechamento.vencimento || new Date();
      
      for (let i = 0; i < fechamento.numero_parcelas; i++) {
        const dataVencimento = new Date(dataVencimentoInicial);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        
        boletosParaCriar.push({
          fechamento_id,
          paciente_id: fechamento.paciente_id,
          clinica_id: fechamento.clinica_id,
          empresa_id: fechamento.empresa_id,
          numero_parcela: i + 1,
          valor: fechamento.valor_parcela,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          gerar_boleto: gerar_automatico,
          dias_antes_vencimento,
          importado_por: req.user.id,
          status: 'pendente'
        });
      }
    }

    // Inserir boletos
    const { data: boletosInseridos, error: insertError } = await supabaseAdmin
      .from('boletos_gestao')
      .insert(boletosParaCriar)
      .select();

    if (insertError) throw insertError;

    res.json({
      success: true,
      message: `${boletosInseridos.length} boletos importados com sucesso`,
      boletos: boletosInseridos,
      fechamento: {
        id: fechamento.id,
        paciente: fechamento.pacientes?.nome,
        valor_total: fechamento.valor_fechado,
        numero_parcelas: fechamento.numero_parcelas
      }
    });
  } catch (error) {
    console.error('Erro ao importar boletos:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/boletos-gestao/:id - Atualizar boleto
const atualizarBoleto = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status,
      data_pagamento,
      valor_pago,
      data_vencimento,
      valor,
      gerar_boleto,
      observacoes
    } = req.body;

    const updateData = {
      atualizado_por: req.user.id,
      atualizado_em: new Date().toISOString()
    };

    // Adicionar campos se fornecidos
    if (status !== undefined) updateData.status = status;
    if (data_pagamento !== undefined) updateData.data_pagamento = data_pagamento;
    if (valor_pago !== undefined) updateData.valor_pago = valor_pago;
    if (data_vencimento !== undefined) updateData.data_vencimento = data_vencimento;
    if (valor !== undefined) updateData.valor = valor;
    if (gerar_boleto !== undefined) updateData.gerar_boleto = gerar_boleto;
    if (observacoes !== undefined) updateData.observacoes = observacoes;

    // Atualizar status automaticamente baseado na ação
    if (data_pagamento && valor_pago) {
      updateData.status = 'pago';
    }

    const { data, error } = await supabaseAdmin
      .from('boletos_gestao')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Boleto atualizado com sucesso',
      boleto: data
    });
  } catch (error) {
    console.error('Erro ao atualizar boleto:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/boletos-gestao/atualizar-status-lote - Atualizar status de vários boletos
const atualizarStatusLote = async (req, res) => {
  try {
    const { ids, status, data_pagamento, valor_pago } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs dos boletos são obrigatórios' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const updateData = {
      status,
      atualizado_por: req.user.id,
      atualizado_em: new Date().toISOString()
    };

    if (status === 'pago') {
      updateData.data_pagamento = data_pagamento || new Date().toISOString().split('T')[0];
      if (valor_pago !== undefined) updateData.valor_pago = valor_pago;
    }

    const { data, error } = await supabaseAdmin
      .from('boletos_gestao')
      .update(updateData)
      .in('id', ids)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: `${data.length} boletos atualizados com sucesso`,
      boletos: data
    });
  } catch (error) {
    console.error('Erro ao atualizar boletos em lote:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/boletos-gestao/gerar-pendentes - Gerar boletos pendentes (job manual)
const gerarBoletosPendentes = async (req, res) => {
  try {
    // Buscar boletos que devem ser gerados
    const { data: boletosParaGerar, error: queryError } = await supabaseAdmin
      .from('vw_boletos_gestao_completo')
      .select('*')
      .eq('gerar_boleto', true)
      .eq('boleto_gerado', false)
      .eq('deve_gerar_hoje', true)
      .eq('empresa_id', 3) // Apenas Caixa por enquanto
      .limit(10); // Processar em lotes

    if (queryError) throw queryError;

    if (!boletosParaGerar || boletosParaGerar.length === 0) {
      return res.json({
        message: 'Nenhum boleto pendente para geração',
        boletos_verificados: 0
      });
    }

    const resultados = [];

    for (const boleto of boletosParaGerar) {
      try {
        // Buscar dados completos do paciente
        const { data: paciente } = await supabaseAdmin
          .from('pacientes')
          .select('*')
          .eq('id', boleto.paciente_id)
          .single();

        if (!paciente || !paciente.cpf) {
          resultados.push({
            boleto_id: boleto.id,
            sucesso: false,
            erro: 'Paciente sem CPF'
          });
          continue;
        }

        // Criar objeto de fechamento fake para o helper
        const fechamentoFake = {
          id: boleto.fechamento_id,
          numero_parcelas: 1, // Gerar apenas este boleto
          valor_parcela: boleto.valor,
          vencimento: boleto.data_vencimento,
          paciente_id: boleto.paciente_id,
          clinica_id: boleto.clinica_id,
          empresa_id: boleto.empresa_id
        };

        // Gerar boleto na Caixa
        const idBeneficiario = process.env.CAIXA_ID_BENEFICIARIO;
        const boletosCriados = await criarBoletosCaixa(
          fechamentoFake,
          paciente,
          idBeneficiario
        );

        if (boletosCriados && boletosCriados.length > 0) {
          const boletoCriado = boletosCriados[0];
          
          // Atualizar boleto com dados da Caixa
          await supabaseAdmin
            .from('boletos_gestao')
            .update({
              boleto_gerado: true,
              data_geracao_boleto: new Date().toISOString(),
              boleto_caixa_id: boletoCriado.id,
              nosso_numero: boletoCriado.nosso_numero,
              numero_documento: boletoCriado.numero_documento,
              linha_digitavel: boletoCriado.linha_digitavel,
              codigo_barras: boletoCriado.codigo_barras,
              url_boleto: boletoCriado.url
            })
            .eq('id', boleto.id);

          resultados.push({
            boleto_id: boleto.id,
            sucesso: true,
            nosso_numero: boletoCriado.nosso_numero
          });
        } else {
          resultados.push({
            boleto_id: boleto.id,
            sucesso: false,
            erro: 'Falha ao gerar boleto na Caixa'
          });
        }
      } catch (error) {
        console.error(`Erro ao gerar boleto ${boleto.id}:`, error);
        resultados.push({
          boleto_id: boleto.id,
          sucesso: false,
          erro: error.message
        });
      }
    }

    const sucessos = resultados.filter(r => r.sucesso).length;
    const falhas = resultados.filter(r => !r.sucesso).length;

    res.json({
      message: `Processo concluído: ${sucessos} boletos gerados, ${falhas} falhas`,
      resultados,
      total_processados: resultados.length,
      sucessos,
      falhas
    });
  } catch (error) {
    console.error('Erro ao gerar boletos pendentes:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/boletos-gestao/importar-arquivo - Importar boleto manualmente com arquivo PDF
const importarBoletoArquivo = async (req, res) => {
  try {
    const { paciente_id, data_vencimento, valor } = req.body;
    const arquivo = req.file;

    if (!paciente_id) {
      return res.status(400).json({ error: 'ID do paciente é obrigatório' });
    }

    if (!data_vencimento) {
      return res.status(400).json({ error: 'Data de vencimento é obrigatória' });
    }

    if (!valor) {
      return res.status(400).json({ error: 'Valor é obrigatório' });
    }

    if (!arquivo) {
      return res.status(400).json({ error: 'Arquivo PDF do boleto é obrigatório' });
    }

    // Validar que é PDF
    if (arquivo.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Apenas arquivos PDF são permitidos' });
    }

    // Buscar dados do paciente
    const { data: paciente, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome, cpf, clinica_id')
      .eq('id', paciente_id)
      .single();

    if (pacienteError || !paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Verificar se há fechamento aprovado para o paciente
    const { data: fechamentosAprovados, error: fechamentosAprovadosError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, clinica_id, aprovado')
      .eq('paciente_id', paciente_id)
      .eq('aprovado', 'aprovado')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fechamentosAprovadosError) throw fechamentosAprovadosError;

    const fechamentoAprovado = Array.isArray(fechamentosAprovados) ? fechamentosAprovados[0] : null;

    if (!fechamentoAprovado) {
      return res.status(400).json({
        error: 'Este paciente ainda não possui um fechamento aprovado. Conclua a aprovação antes de importar boletos.'
      });
    }

    const fechamentoIdParaVincular = fechamentoAprovado.id;
    let clinicaId = fechamentoAprovado.clinica_id || paciente.clinica_id || null;

    if (!clinicaId) {
      console.warn(`⚠️ [IMPORTAR ARQUIVO] Fechamento aprovado ${fechamentoIdParaVincular} ou paciente ${paciente_id} sem clínica associada.`);
    }

    console.log(`📋 [IMPORTAR ARQUIVO] Vinculando boleto ao fechamento: ${fechamentoIdParaVincular || 'null'}`);

    // Upload do arquivo PDF para Supabase Storage
    const uploadResult = await uploadToSupabase(
      arquivo,
      STORAGE_BUCKET_DOCUMENTOS,
      `pacientes/${paciente_id}/boletos`,
      'boleto'
    );

    // Gerar URL pública do arquivo
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET_DOCUMENTOS)
      .getPublicUrl(uploadResult.path);

    const urlBoleto = urlData.publicUrl;

    // Buscar id_beneficiario da empresa (necessário para boletos_caixa)
    const { data: empresaData } = await supabaseAdmin
      .from('empresas')
      .select('id')
      .eq('id', 3) // Caixa (padrão)
      .single();
    
    // Obter ID do beneficiário da variável de ambiente
    const idBeneficiarioRaw = process.env.CAIXA_ID_BENEFICIARIO;
    let idBeneficiario = null;
    
    if (idBeneficiarioRaw) {
      // Normalizar ID do beneficiário (pode vir como "0374/1242669" ou apenas "1242669")
      if (idBeneficiarioRaw.includes('/')) {
        idBeneficiario = idBeneficiarioRaw.split('/')[1].trim();
      } else {
        idBeneficiario = idBeneficiarioRaw.trim();
      }
    }

    // Criar registro em boletos_caixa (para aparecer para paciente e clínica)
    const numeroDocumento = `MANUAL-${Date.now()}`;
    
    const { data: boletoCaixa, error: boletoCaixaError } = await supabaseAdmin
      .from('boletos_caixa')
      .insert([{
        paciente_id: parseInt(paciente_id),
        fechamento_id: fechamentoIdParaVincular, // Vincular ao fechamento se existir
        id_beneficiario: idBeneficiario, // ID do beneficiário da Caixa
        nosso_numero: null, // Boleto manual não tem nosso número da Caixa
        numero_documento: numeroDocumento,
        codigo_barras: null,
        linha_digitavel: null,
        url: urlBoleto,
        qrcode: null,
        url_qrcode: null,
        valor: parseFloat(valor),
        data_vencimento: data_vencimento,
        data_emissao: new Date().toISOString().split('T')[0],
        situacao: 'EM ABERTO',
        status: 'pendente',
        empresa_id: 3, // Caixa (padrão)
        parcela_numero: 1,
        sincronizado_em: new Date().toISOString()
      }])
      .select()
      .single();

    if (boletoCaixaError) {
      console.error('Erro ao criar boleto em boletos_caixa:', boletoCaixaError);
      throw boletoCaixaError;
    }

    // Criar registro em boletos_gestao (para gestão) - AGORA É OBRIGATÓRIO
    const { data: boletoGestao, error: boletoGestaoError } = await supabaseAdmin
      .from('boletos_gestao')
      .insert([{
        fechamento_id: fechamentoIdParaVincular, // Vincular ao fechamento se existir
        paciente_id: parseInt(paciente_id),
        clinica_id: clinicaId,
        empresa_id: 3, // Caixa (padrão)
        numero_parcela: 1,
        valor: parseFloat(valor),
        data_vencimento: data_vencimento,
        status: 'pendente',
        boleto_gerado: true, // Já foi "gerado" (importado)
        data_geracao_boleto: new Date().toISOString(),
        gerar_boleto: false, // Não precisa gerar novamente
        dias_antes_vencimento: 20,
        boleto_caixa_id: boletoCaixa.id,
        nosso_numero: null,
        numero_documento: numeroDocumento,
        linha_digitavel: null,
        codigo_barras: null,
        url_boleto: urlBoleto,
        observacoes: `Boleto importado manualmente em ${new Date().toISOString()}`
        // Removido importado_por pois pode causar erro se req.user.id não for UUID
      }])
      .select()
      .single();

    if (boletoGestaoError) {
      console.error('❌ [IMPORTAR ARQUIVO] Erro ao criar boleto em boletos_gestao:', boletoGestaoError);
      console.error('❌ [IMPORTAR ARQUIVO] Detalhes do erro:', JSON.stringify(boletoGestaoError, null, 2));
      // AGORA VAMOS FALHAR se não conseguir criar em boletos_gestao
      throw new Error(`Erro ao criar boleto em boletos_gestao: ${boletoGestaoError.message}`);
    } else {
      console.log(`✅ [IMPORTAR ARQUIVO] Boleto criado em boletos_gestao com ID: ${boletoGestao.id}`);
    }

    console.log(`✅ [IMPORTAR ARQUIVO] Boleto importado com sucesso para paciente ${paciente_id}`);

    res.json({
      success: true,
      message: 'Boleto importado com sucesso',
      boleto: {
        id: boletoCaixa.id,
        paciente_id: parseInt(paciente_id),
        paciente_nome: paciente.nome,
        valor: parseFloat(valor),
        data_vencimento: data_vencimento,
        url_boleto: urlBoleto,
        numero_documento: numeroDocumento
      }
    });
  } catch (error) {
    console.error('Erro ao importar boleto com arquivo:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/boletos-gestao/importar-caixa - Importar boletos existentes de boletos_caixa
const importarBoletosCaixa = async (req, res) => {
  try {
    const { 
      fechamento_id,
      paciente_id
    } = req.body;

    if (!fechamento_id && !paciente_id) {
      return res.status(400).json({ 
        error: 'É necessário informar fechamento_id ou paciente_id' 
      });
    }

    // Buscar boletos existentes em boletos_caixa
    let queryBoletosCaixa = supabaseAdmin
      .from('boletos_caixa')
      .select('*')
      .is('erro_criacao', null) // Apenas boletos sem erro
      .neq('status', 'erro');

    if (fechamento_id) {
      queryBoletosCaixa = queryBoletosCaixa.eq('fechamento_id', fechamento_id);
    }
    if (paciente_id) {
      queryBoletosCaixa = queryBoletosCaixa.eq('paciente_id', paciente_id);
    }

    const { data: boletosCaixa, error: boletosCaixaError } = await queryBoletosCaixa;

    if (boletosCaixaError) throw boletosCaixaError;

    if (!boletosCaixa || boletosCaixa.length === 0) {
      return res.status(404).json({ 
        error: 'Nenhum boleto encontrado em boletos_caixa',
        fechamento_id,
        paciente_id
      });
    }

    console.log(`📋 [IMPORTAR CAIXA] Encontrados ${boletosCaixa.length} boletos em boletos_caixa`);

    // Buscar fechamentos relacionados para obter dados completos
    const fechamentoIds = [...new Set(boletosCaixa.map(b => b.fechamento_id))];
    const { data: fechamentos, error: fechamentosError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, paciente_id, clinica_id, empresa_id, numero_parcelas')
      .in('id', fechamentoIds);

    if (fechamentosError) throw fechamentosError;

    const fechamentosMap = {};
    fechamentos.forEach(f => {
      fechamentosMap[f.id] = f;
    });

    // Verificar quais boletos já foram importados
    const boletosCaixaIds = boletosCaixa.map(b => b.id);
    const { data: boletosJaImportados, error: importadosError } = await supabaseAdmin
      .from('boletos_gestao')
      .select('boleto_caixa_id')
      .in('boleto_caixa_id', boletosCaixaIds);

    if (importadosError) throw importadosError;

    const idsJaImportados = new Set(
      (boletosJaImportados || []).map(b => b.boleto_caixa_id)
    );

    // Filtrar apenas boletos que ainda não foram importados
    const boletosParaImportar = boletosCaixa.filter(b => !idsJaImportados.has(b.id));

    if (boletosParaImportar.length === 0) {
      return res.json({
        success: true,
        message: 'Todos os boletos já foram importados',
        total_encontrados: boletosCaixa.length,
        total_importados: 0,
        boletos: []
      });
    }

    console.log(`📋 [IMPORTAR CAIXA] ${boletosParaImportar.length} boletos para importar`);

    // Criar registros em boletos_gestao
    const boletosParaCriar = boletosParaImportar.map(boletoCaixa => {
      const fechamento = fechamentosMap[boletoCaixa.fechamento_id];
      
      if (!fechamento) {
        console.warn(`⚠️ [IMPORTAR CAIXA] Fechamento ${boletoCaixa.fechamento_id} não encontrado para boleto ${boletoCaixa.id}`);
        return null;
      }

      // Determinar status baseado na situação do boleto
      let status = 'pendente';
      if (boletoCaixa.situacao === 'PAGO' || boletoCaixa.situacao === 'LIQUIDADO') {
        status = 'pago';
      } else if (boletoCaixa.situacao === 'CANCELADO') {
        status = 'cancelado';
      } else {
        // Verificar se está vencido
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(boletoCaixa.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        if (vencimento < hoje && status === 'pendente') {
          status = 'vencido';
        }
      }

      return {
        fechamento_id: boletoCaixa.fechamento_id,
        paciente_id: boletoCaixa.paciente_id,
        clinica_id: fechamento.clinica_id,
        empresa_id: fechamento.empresa_id,
        numero_parcela: boletoCaixa.parcela_numero || 1,
        valor: parseFloat(boletoCaixa.valor) || 0,
        data_vencimento: boletoCaixa.data_vencimento,
        status: status,
        // Boleto já foi gerado na Caixa
        boleto_gerado: true,
        data_geracao_boleto: boletoCaixa.sincronizado_em || boletoCaixa.created_at || new Date().toISOString(),
        gerar_boleto: false, // Não precisa gerar novamente
        dias_antes_vencimento: 20,
        // Dados do boleto gerado
        boleto_caixa_id: boletoCaixa.id,
        nosso_numero: boletoCaixa.nosso_numero,
        numero_documento: boletoCaixa.numero_documento,
        linha_digitavel: boletoCaixa.linha_digitavel,
        codigo_barras: boletoCaixa.codigo_barras,
        url_boleto: boletoCaixa.url,
        importado_por: req.user.id,
        observacoes: `Importado de boletos_caixa em ${new Date().toISOString()}`
      };
    }).filter(b => b !== null); // Remover nulos

    if (boletosParaCriar.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhum boleto válido para importar (fechamentos não encontrados)' 
      });
    }

    // Inserir boletos
    const { data: boletosInseridos, error: insertError } = await supabaseAdmin
      .from('boletos_gestao')
      .insert(boletosParaCriar)
      .select();

    if (insertError) {
      console.error('❌ [IMPORTAR CAIXA] Erro ao inserir:', insertError);
      throw insertError;
    }

    console.log(`✅ [IMPORTAR CAIXA] ${boletosInseridos.length} boletos importados com sucesso`);

    res.json({
      success: true,
      message: `${boletosInseridos.length} boletos importados de boletos_caixa com sucesso`,
      total_encontrados: boletosCaixa.length,
      total_ja_importados: idsJaImportados.size,
      total_importados: boletosInseridos.length,
      boletos: boletosInseridos
    });
  } catch (error) {
    console.error('Erro ao importar boletos de boletos_caixa:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/boletos-gestao/:id - Excluir boleto
const excluirBoleto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o boleto existe e não foi gerado
    const { data: boleto, error: fetchError } = await supabaseAdmin
      .from('boletos_gestao')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !boleto) {
      return res.status(404).json({ error: 'Boleto não encontrado' });
    }

    if (boleto.boleto_gerado) {
      return res.status(400).json({ 
        error: 'Não é possível excluir um boleto já gerado na Caixa' 
      });
    }

    const { error } = await supabaseAdmin
      .from('boletos_gestao')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Boleto excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir boleto:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listarBoletos,
  importarBoletos,
  importarBoletoArquivo,
  importarBoletosCaixa,
  atualizarBoleto,
  atualizarStatusLote,
  gerarBoletosPendentes,
  excluirBoleto
};

