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
    let boletosCaixa = [];
    const boletosCaixaResponse = await supabaseAdmin
      .from('boletos_caixa')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('data_vencimento', { ascending: true });

    if (boletosCaixaResponse.error) throw boletosCaixaResponse.error;
    boletosCaixa = boletosCaixaResponse.data || [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const boletosCaixaFormatados = boletosCaixa.map(boleto => {
      let status = boleto.status || 'pendente';

      if (boleto.status === 'pago' || boleto.status === 'cancelado') {
        status = boleto.status;
      } else {
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
        url_boleto: boleto.url, // boletos_caixa tem apenas 'url', mapear como url_boleto para compatibilidade
        qrcode: boleto.qrcode,
        url_qrcode: boleto.url_qrcode,
        parcela_numero: boleto.parcela_numero,
        fechamento_id: boleto.fechamento_id,
        origem: 'caixa'
      };
    });

    // Buscar boletos da tabela boletos_gestao (parcelas cadastradas pelo admin)
    let boletosGestao = [];
    try {
      const boletosGestaoResponse = await supabaseAdmin
        .from('boletos_gestao')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('data_vencimento', { ascending: true });

      if (boletosGestaoResponse.error) {
        if (boletosGestaoResponse.error.code === 'PGRST205' || boletosGestaoResponse.error.message?.includes('does not exist')) {
          console.warn('⚠️ [BoletosPaciente] Tabela boletos_gestao não encontrada. Ignorando...');
        } else {
          throw boletosGestaoResponse.error;
        }
      } else {
        boletosGestao = boletosGestaoResponse.data || [];
      }
    } catch (gestaoError) {
      if (gestaoError.code === 'PGRST205' || gestaoError.message?.includes('does not exist')) {
        console.warn('⚠️ [BoletosPaciente] Tabela boletos_gestao não disponível. Prosseguindo apenas com boletos_caixa.');
      } else {
        throw gestaoError;
      }
    }

    const boletosCaixaIds = new Set(boletosCaixa.map(b => b.id));

    const boletosGestaoFormatados = boletosGestao
      .filter(bg => !bg.boleto_caixa_id || !boletosCaixaIds.has(bg.boleto_caixa_id))
      .map(bg => {
        let status = bg.status || 'pendente';

        if (bg.status === 'pago' || bg.status === 'cancelado') {
          status = bg.status;
        } else if (bg.data_pagamento) {
          status = 'pago';
        } else {
          const vencimento = bg.data_vencimento ? new Date(bg.data_vencimento) : null;
          if (vencimento) {
            vencimento.setHours(0, 0, 0, 0);
            if (vencimento < hoje) {
              status = 'vencido';
            } else {
              status = 'pendente';
            }
          }
        }

        const numeroDocumento = bg.numero_documento || (bg.fechamento_id ? `FEC-${bg.fechamento_id}-PARC-${bg.numero_parcela || bg.parcela_numero || ''}` : `PARC-${bg.numero_parcela || bg.parcela_numero || bg.id}`);

        const urlBoleto = bg.url_boleto || bg.url || null;
        return {
          id: `GESTAO-${bg.id}`,
          nosso_numero: bg.nosso_numero || null,
          numero_documento: numeroDocumento,
          valor: parseFloat(bg.valor || 0),
          valor_pago: bg.valor_pago ? parseFloat(bg.valor_pago) : null,
          data_vencimento: bg.data_vencimento,
          data_emissao: bg.data_emissao || bg.created_at,
          data_hora_pagamento: bg.data_pagamento || null,
          situacao: bg.status ? bg.status.toUpperCase() : 'EM ABERTO',
          status,
          codigo_barras: bg.codigo_barras || null,
          linha_digitavel: bg.linha_digitavel || null,
          url: urlBoleto,
          url_boleto: urlBoleto, // Retornar também url_boleto para manter consistência
          qrcode: bg.qrcode || null,
          url_qrcode: bg.url_qrcode || null,
          parcela_numero: bg.numero_parcela || bg.parcela_numero || null,
          fechamento_id: bg.fechamento_id,
          origem: 'gestao'
        };
      });

    const boletosCombinados = [...boletosCaixaFormatados, ...boletosGestaoFormatados].sort((a, b) => {
      const dataA = a.data_vencimento ? new Date(a.data_vencimento) : (a.data_emissao ? new Date(a.data_emissao) : new Date(0));
      const dataB = b.data_vencimento ? new Date(b.data_vencimento) : (b.data_emissao ? new Date(b.data_emissao) : new Date(0));
      return dataA - dataB;
    });

    return res.json({ boletos: boletosCombinados });

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
      const situacaoUpper = (dadosBoleto.situacao || '').toUpperCase();
      if (situacaoUpper === 'PAGO' || 
          situacaoUpper === 'LIQUIDADO' || 
          situacaoUpper.includes('PAGO') || 
          situacaoUpper === 'TITULO JA PAGO NO DIA') {
        status = 'pago';
      } else if (situacaoUpper === 'BAIXADO' || situacaoUpper === 'CANCELADO') {
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

      // Converter formato da data da Caixa para timestamp válido do PostgreSQL
      // Formato da Caixa: "2025-11-12-11.43.06" -> Formato PostgreSQL: "2025-11-12 11:43:06"
      let dataHoraPagamentoFormatada = null;
      if (dadosBoleto.data_hora_pagamento) {
        const dataHoraCaixa = dadosBoleto.data_hora_pagamento;
        // Converter "2025-11-12-11.43.06" para "2025-11-12 11:43:06"
        if (dataHoraCaixa.includes('-') && dataHoraCaixa.includes('.')) {
          // Substituir o 4º hífen por espaço e os pontos por dois pontos
          const partes = dataHoraCaixa.split('-');
          if (partes.length >= 4) {
            const data = `${partes[0]}-${partes[1]}-${partes[2]}`;
            const hora = partes[3].replace(/\./g, ':');
            dataHoraPagamentoFormatada = `${data} ${hora}`;
          }
        } else {
          // Se já estiver em formato válido, usar como está
          dataHoraPagamentoFormatada = dataHoraCaixa;
        }
      }

      // Atualizar boleto no banco
      const updateData = {
        situacao: dadosBoleto.situacao || boleto.situacao,
        status: status,
        valor_pago: dadosBoleto.valor_pago || boleto.valor_pago,
        data_hora_pagamento: dataHoraPagamentoFormatada || boleto.data_hora_pagamento,
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

      // Atualizar também boletos_gestao se existir registro relacionado
      const { data: boletoGestao, error: gestaoError } = await supabaseAdmin
        .from('boletos_gestao')
        .select('id')
        .eq('boleto_caixa_id', boleto_id)
        .maybeSingle();

      if (boletoGestao && !gestaoError) {
        // Extrair data de data_hora_pagamento (formato: "2025-11-12-11.20.30" -> "2025-11-12")
        let dataPagamento = null;
        if (boletoAtualizado.data_hora_pagamento) {
          // Formato da Caixa: "2025-11-12-11.20.30" - extrair apenas a data (primeiros 10 caracteres)
          const dataHoraPagamento = boletoAtualizado.data_hora_pagamento;
          if (dataHoraPagamento.length >= 10) {
            dataPagamento = dataHoraPagamento.substring(0, 10); // "2025-11-12"
          }
        }

        const updateDataGestao = {
          status: status,
          valor_pago: boletoAtualizado.valor_pago,
          data_pagamento: dataPagamento,
          atualizado_em: new Date().toISOString()
        };

        const { error: updateGestaoError } = await supabaseAdmin
          .from('boletos_gestao')
          .update(updateDataGestao)
          .eq('id', boletoGestao.id);
        
        if (updateGestaoError) {
          console.error(`⚠️ Erro ao atualizar boletos_gestao ${boletoGestao.id}:`, updateGestaoError);
        } else {
          console.log(`✅ Boleto gestão ${boletoGestao.id} também atualizado (status: ${status})`);
        }
      }

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
        const situacaoUpper = (dadosBoleto.situacao || '').toUpperCase();
        if (situacaoUpper === 'PAGO' || 
            situacaoUpper === 'LIQUIDADO' || 
            situacaoUpper.includes('PAGO') || 
            situacaoUpper === 'TITULO JA PAGO NO DIA') {
          status = 'pago';
        } else if (situacaoUpper === 'BAIXADO' || situacaoUpper === 'CANCELADO') {
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

        // Converter formato da data da Caixa para timestamp válido do PostgreSQL
        // Formato da Caixa: "2025-11-12-11.43.06" -> Formato PostgreSQL: "2025-11-12 11:43:06"
        let dataHoraPagamentoFormatada = null;
        if (dadosBoleto.data_hora_pagamento) {
          const dataHoraCaixa = dadosBoleto.data_hora_pagamento;
          // Converter "2025-11-12-11.43.06" para "2025-11-12 11:43:06"
          if (dataHoraCaixa.includes('-') && dataHoraCaixa.includes('.')) {
            // Substituir o 4º hífen por espaço e os pontos por dois pontos
            const partes = dataHoraCaixa.split('-');
            if (partes.length >= 4) {
              const data = `${partes[0]}-${partes[1]}-${partes[2]}`;
              const hora = partes[3].replace(/\./g, ':');
              dataHoraPagamentoFormatada = `${data} ${hora}`;
            }
          } else {
            // Se já estiver em formato válido, usar como está
            dataHoraPagamentoFormatada = dataHoraCaixa;
          }
        }

        // Atualizar no banco
        const updateData = {
          situacao: dadosBoleto.situacao || boleto.situacao,
          status: status,
          valor_pago: dadosBoleto.valor_pago || boleto.valor_pago,
          data_hora_pagamento: dataHoraPagamentoFormatada || boleto.data_hora_pagamento,
          sincronizado_em: new Date().toISOString()
        };

        const { data: boletoAtualizado, error: updateError } = await supabaseAdmin
          .from('boletos_caixa')
          .update(updateData)
          .eq('id', boleto.id)
          .select()
          .single();

        if (updateError) {
          console.error(`⚠️ Erro ao atualizar boletos_caixa ${boleto.id}:`, updateError);
          resultados.erros++;
          continue; // Pular para o próximo boleto
        }

        // Atualizar também boletos_gestao se existir registro relacionado
        const { data: boletoGestao, error: gestaoError } = await supabaseAdmin
          .from('boletos_gestao')
          .select('id')
          .eq('boleto_caixa_id', boleto.id)
          .maybeSingle();

        if (boletoGestao && !gestaoError) {
          // Extrair data de data_hora_pagamento (formato: "2025-11-12-11.20.30" -> "2025-11-12")
          let dataPagamento = null;
          if (updateData.data_hora_pagamento) {
            // Formato da Caixa: "2025-11-12-11.20.30" - extrair apenas a data (primeiros 10 caracteres)
            const dataHoraPagamento = updateData.data_hora_pagamento;
            if (dataHoraPagamento.length >= 10) {
              dataPagamento = dataHoraPagamento.substring(0, 10); // "2025-11-12"
            }
          }

          const updateDataGestao = {
            status: status,
            valor_pago: updateData.valor_pago,
            data_pagamento: dataPagamento,
            atualizado_em: new Date().toISOString()
          };

          const { error: updateGestaoError } = await supabaseAdmin
            .from('boletos_gestao')
            .update(updateDataGestao)
            .eq('id', boletoGestao.id);
          
          if (updateGestaoError) {
            console.error(`⚠️ Erro ao atualizar boletos_gestao ${boletoGestao.id}:`, updateGestaoError);
          } else {
            console.log(`✅ Boleto gestão ${boletoGestao.id} também atualizado (status: ${status})`);
          }
        }

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
        
        // Tratar erro específico: "NOSSO NUMERO NAO CADASTRADO"
        // Isso significa que o boleto foi cancelado ou não existe mais na Caixa
        const errorMessage = error.message || '';
        if (errorMessage.includes('NOSSO NUMERO NAO CADASTRADO') || 
            errorMessage.includes('NAO CADASTRADO PARA O BENEFICIARIO')) {
          console.log(`⚠️ Boleto ${boleto.id} não encontrado na Caixa. Marcando como cancelado.`);
          
          try {
            // Marcar boleto como cancelado no banco
            await supabaseAdmin
              .from('boletos_caixa')
              .update({
                status: 'cancelado',
                situacao: 'BOLETO NAO ENCONTRADO NA CAIXA',
                sincronizado_em: new Date().toISOString()
              })
              .eq('id', boleto.id);
            
            resultados.sincronizados++;
            resultados.atualizados.push({
              id: boleto.id,
              nosso_numero: boleto.nosso_numero,
              status_anterior: boleto.status,
              status_novo: 'cancelado',
              situacao: 'BOLETO NAO ENCONTRADO NA CAIXA'
            });
          } catch (updateError) {
            console.error(`Erro ao atualizar boleto ${boleto.id} como cancelado:`, updateError);
            resultados.erros++;
          }
        } else {
          resultados.erros++;
        }
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
