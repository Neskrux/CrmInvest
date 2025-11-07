const { supabaseAdmin } = require('../config/database');
const { criarBoletosCaixa } = require('../utils/caixa-boletos.helper');

// GET /api/boletos-gestao - Listar boletos com filtros
const listarBoletos = async (req, res) => {
  try {
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

    let query = supabaseAdmin
      .from('vw_boletos_gestao_completo')
      .select('*', { count: 'exact' });

    // Filtros
    if (fechamento_id) query = query.eq('fechamento_id', fechamento_id);
    if (paciente_id) query = query.eq('paciente_id', paciente_id);
    if (clinica_id) query = query.eq('clinica_id', clinica_id);
    if (status) query = query.eq('status', status);
    if (gerar_boleto !== undefined) query = query.eq('gerar_boleto', gerar_boleto === 'true');
    if (boleto_gerado !== undefined) query = query.eq('boleto_gerado', boleto_gerado === 'true');
    
    if (vencimento_de) query = query.gte('data_vencimento', vencimento_de);
    if (vencimento_ate) query = query.lte('data_vencimento', vencimento_ate);

    // Filtro por empresa para não-admin
    if (req.user.tipo !== 'admin' && req.user.empresa_id) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }

    // Paginação
    const offset = (page - 1) * limit;
    query = query
      .order('data_vencimento', { ascending: true })
      .order('numero_parcela', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      boletos: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('Erro ao listar boletos:', error);
    res.status(500).json({ error: error.message });
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
  atualizarBoleto,
  atualizarStatusLote,
  gerarBoletosPendentes,
  excluirBoleto
};

