const { supabase, supabaseAdmin } = require('../config/database');
const caixaBoletoService = require('../services/caixa-boleto.service');

/**
 * GET /api/paciente/boletos - Listar boletos do paciente logado
 */
const getBoletosPaciente = async (req, res) => {
  try {
    // Verificar se é paciente
    if (req.user.tipo !== 'paciente') {
      return res.status(403).json({ error: 'Acesso negado. Apenas pacientes podem ver seus boletos.' });
    }

    const pacienteId = req.user.paciente_id || req.user.id;

    // Buscar boletos da tabela boletos_caixa (prioridade)
    const { data: boletosCaixa, error: boletosError } = await supabaseAdmin
      .from('boletos_caixa')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('data_vencimento', { ascending: true });

    if (boletosError) throw boletosError;

    // Se há boletos na tabela boletos_caixa, usar eles
    if (boletosCaixa && boletosCaixa.length > 0) {
      // Calcular status para cada boleto
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const boletosComStatus = boletosCaixa.map(boleto => {
        let status = boleto.status || 'pendente';

        // Se já tem status explícito (pago, cancelado), manter
        if (boleto.status === 'pago' || boleto.status === 'cancelado') {
          status = boleto.status;
        } else {
          // Caso contrário, calcular baseado na data de vencimento
          const vencimento = boleto.data_vencimento ? new Date(boleto.data_vencimento) : null;
          if (vencimento) {
            vencimento.setHours(0, 0, 0, 0);
            if (vencimento < hoje) {
              status = 'vencido';
            } else {
              status = 'pendente';
            }
          }
        }

        return {
          id: boleto.id,
          nosso_numero: boleto.nosso_numero,
          numero_documento: boleto.numero_documento,
          valor: parseFloat(boleto.valor || 0),
          valor_pago: boleto.valor_pago ? parseFloat(boleto.valor_pago) : null,
          data_vencimento: boleto.data_vencimento,
          data_emissao: boleto.data_emissao,
          data_hora_pagamento: boleto.data_hora_pagamento,
          situacao: boleto.situacao,
          status: status,
          codigo_barras: boleto.codigo_barras,
          linha_digitavel: boleto.linha_digitavel,
          url: boleto.url,
          qrcode: boleto.qrcode,
          url_qrcode: boleto.url_qrcode,
          parcela_numero: boleto.parcela_numero,
          fechamento_id: boleto.fechamento_id
        };
      });

      return res.json({ boletos: boletosComStatus });
    }

    // Fallback: buscar de fechamentos (compatibilidade)
    const { data: fechamentos, error: fechamentosError } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('data_fechamento', { ascending: false });

    if (fechamentosError) throw fechamentosError;

    // Converter fechamentos em boletos (formato simplificado)
    const boletosFromFechamentos = fechamentos.map(fechamento => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      let status = 'pendente';
      const vencimento = fechamento.vencimento ? new Date(fechamento.vencimento) : null;
      if (vencimento) {
        vencimento.setHours(0, 0, 0, 0);
        if (vencimento < hoje) {
          status = 'vencido';
        }
      }

      return {
        id: fechamento.id,
        nosso_numero: null,
        numero_documento: `FEC-${fechamento.id}`,
        valor: parseFloat(fechamento.valor_fechado || 0),
        valor_pago: null,
        data_vencimento: fechamento.vencimento || fechamento.data_fechamento,
        data_emissao: fechamento.data_fechamento,
        data_hora_pagamento: null,
        situacao: 'EM ABERTO',
        status: status,
        codigo_barras: null,
        linha_digitavel: null,
        url: null,
        qrcode: null,
        url_qrcode: null,
        parcela_numero: null,
        fechamento_id: fechamento.id
      };
    });

    return res.json({ boletos: boletosFromFechamentos });

  } catch (error) {
    console.error('Erro ao buscar boletos do paciente:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
};

/**
 * Sincronizar status de um boleto consultando a API Caixa
 * GET /api/paciente/boletos/sincronizar/:boleto_id
 */
const sincronizarStatusBoleto = async (req, res) => {
  try {
    // Verificar se é paciente
    if (req.user.tipo !== 'paciente') {
      return res.status(403).json({ error: 'Acesso negado. Apenas pacientes podem sincronizar seus boletos.' });
    }

    const { boleto_id } = req.params;
    const pacienteId = req.user.paciente_id || req.user.id;

    // Buscar boleto no banco
    const { data: boleto, error: boletoError } = await supabaseAdmin
      .from('boletos_caixa')
      .select('*')
      .eq('id', boleto_id)
      .eq('paciente_id', pacienteId)
      .single();

    if (boletoError || !boleto) {
      return res.status(404).json({ error: 'Boleto não encontrado' });
    }

    if (!boleto.nosso_numero || !boleto.id_beneficiario) {
      return res.status(400).json({ error: 'Boleto não possui dados suficientes para sincronização' });
    }

    // Consultar status na API Caixa
    try {
      const dadosBoleto = await caixaBoletoService.consultarBoleto(
        boleto.id_beneficiario,
        boleto.nosso_numero
      );

      // Determinar status baseado na situação retornada pela Caixa
      let status = 'pendente';
      if (dadosBoleto.situacao === 'PAGO' || dadosBoleto.situacao === 'LIQUIDADO') {
        status = 'pago';
      } else if (dadosBoleto.situacao === 'BAIXADO' || dadosBoleto.situacao === 'CANCELADO') {
        status = 'cancelado';
      } else {
        // Verificar se está vencido baseado na data
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = dadosBoleto.data_vencimento ? new Date(dadosBoleto.data_vencimento) : null;
        if (vencimento) {
          vencimento.setHours(0, 0, 0, 0);
          if (vencimento < hoje) {
            status = 'vencido';
          } else {
            status = 'pendente';
          }
        }
      }

      // Atualizar boleto no banco
      const updateData = {
        situacao: dadosBoleto.situacao || boleto.situacao,
        status: status,
        valor_pago: dadosBoleto.valor_pago || boleto.valor_pago,
        data_hora_pagamento: dadosBoleto.data_hora_pagamento || boleto.data_hora_pagamento,
        sincronizado_em: new Date().toISOString()
      };

      // Atualizar campos se retornados pela API
      if (dadosBoleto.codigo_barras) updateData.codigo_barras = dadosBoleto.codigo_barras;
      if (dadosBoleto.linha_digitavel) updateData.linha_digitavel = dadosBoleto.linha_digitavel;
      if (dadosBoleto.url) updateData.url = dadosBoleto.url;
      if (dadosBoleto.qrcode) updateData.qrcode = dadosBoleto.qrcode;
      if (dadosBoleto.url_qrcode) updateData.url_qrcode = dadosBoleto.url_qrcode;

      const { data: boletoAtualizado, error: updateError } = await supabaseAdmin
        .from('boletos_caixa')
        .update(updateData)
        .eq('id', boleto_id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json({
        success: true,
        message: 'Status sincronizado com sucesso',
        boleto: {
          id: boletoAtualizado.id,
          nosso_numero: boletoAtualizado.nosso_numero,
          situacao: boletoAtualizado.situacao,
          status: boletoAtualizado.status,
          valor_pago: boletoAtualizado.valor_pago,
          data_hora_pagamento: boletoAtualizado.data_hora_pagamento
        }
      });

    } catch (apiError) {
      console.error('Erro ao consultar boleto na Caixa:', apiError);
      
      // Atualizar tentativa de sincronização
      await supabaseAdmin
        .from('boletos_caixa')
        .update({
          sincronizado_em: new Date().toISOString(),
          erro_criacao: apiError.response?.data?.mensagem || apiError.message
        })
        .eq('id', boleto_id);

      return res.status(500).json({
        error: 'Erro ao sincronizar com API Caixa',
        message: apiError.response?.data?.mensagem || apiError.message
      });
    }

  } catch (error) {
    console.error('Erro ao sincronizar status do boleto:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
};

/**
 * Sincronizar todos os boletos do paciente
 * POST /api/paciente/boletos/sincronizar-todos
 */
const sincronizarTodosBoletos = async (req, res) => {
  try {
    // Verificar se é paciente
    if (req.user.tipo !== 'paciente') {
      return res.status(403).json({ error: 'Acesso negado. Apenas pacientes podem sincronizar seus boletos.' });
    }

    const pacienteId = req.user.paciente_id || req.user.id;

    // Buscar todos os boletos pendentes ou vencidos do paciente
    const { data: boletos, error: boletosError } = await supabaseAdmin
      .from('boletos_caixa')
      .select('*')
      .eq('paciente_id', pacienteId)
      .in('status', ['pendente', 'vencido'])
      .not('nosso_numero', 'is', null)
      .not('id_beneficiario', 'is', null);

    if (boletosError) throw boletosError;

    if (!boletos || boletos.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum boleto para sincronizar',
        sincronizados: 0,
        total: 0
      });
    }

    const resultados = {
      sincronizados: 0,
      erros: 0,
      atualizados: []
    };

    // Sincronizar cada boleto (com delay para respeitar rate limit)
    for (let i = 0; i < boletos.length; i++) {
      const boleto = boletos[i];
      
      try {
        const dadosBoleto = await caixaBoletoService.consultarBoleto(
          boleto.id_beneficiario,
          boleto.nosso_numero
        );

        // Determinar status
        let status = 'pendente';
        if (dadosBoleto.situacao === 'PAGO' || dadosBoleto.situacao === 'LIQUIDADO') {
          status = 'pago';
        } else if (dadosBoleto.situacao === 'BAIXADO' || dadosBoleto.situacao === 'CANCELADO') {
          status = 'cancelado';
        } else {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const vencimento = dadosBoleto.data_vencimento ? new Date(dadosBoleto.data_vencimento) : null;
          if (vencimento) {
            vencimento.setHours(0, 0, 0, 0);
            if (vencimento < hoje) {
              status = 'vencido';
            }
          }
        }

        // Atualizar no banco
        const updateData = {
          situacao: dadosBoleto.situacao || boleto.situacao,
          status: status,
          valor_pago: dadosBoleto.valor_pago || boleto.valor_pago,
          data_hora_pagamento: dadosBoleto.data_hora_pagamento || boleto.data_hora_pagamento,
          sincronizado_em: new Date().toISOString()
        };

        await supabaseAdmin
          .from('boletos_caixa')
          .update(updateData)
          .eq('id', boleto.id);

        resultados.sincronizados++;
        resultados.atualizados.push({
          id: boleto.id,
          nosso_numero: boleto.nosso_numero,
          status_anterior: boleto.status,
          status_novo: status,
          situacao: updateData.situacao
        });

        // Delay entre requisições (rate limit: 5 calls/segundo)
        if (i < boletos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250)); // 250ms = 4 calls/segundo
        }

      } catch (error) {
        console.error(`Erro ao sincronizar boleto ${boleto.id}:`, error);
        resultados.erros++;
      }
    }

    res.json({
      success: true,
      message: `Sincronização concluída: ${resultados.sincronizados} boletos atualizados`,
      resultados
    });

  } catch (error) {
    console.error('Erro ao sincronizar boletos:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
};

module.exports = {
  getBoletosPaciente,
  sincronizarStatusBoleto,
  sincronizarTodosBoletos
};
