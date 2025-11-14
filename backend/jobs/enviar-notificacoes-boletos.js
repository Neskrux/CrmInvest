const { supabaseAdmin } = require('../config/database');
const zApiService = require('../services/z-api.service');

/**
 * Job para enviar notificações automáticas de boletos via WhatsApp
 * Deve ser executado diariamente (via cron ou scheduler)
 * 
 * Envia mensagens:
 * - 3 dias antes do vencimento
 * - No dia do vencimento
 * - Quando o boleto está vencido
 */
class EnviadorNotificacoesBoletos {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Executa o job de envio de notificações
   */
  async executar() {
    if (this.isRunning) {
      console.log('⚠️ [JOB NOTIFICAÇÕES] Job já está em execução');
      return;
    }

    this.isRunning = true;
    const inicio = new Date();
    console.log(`🚀 [JOB NOTIFICAÇÕES] Iniciando envio de notificações - ${inicio.toISOString()}`);

    try {
      const resultados = {
        notificacoes_3_dias: { sucessos: 0, falhas: 0, detalhes: [] },
        notificacoes_no_dia: { sucessos: 0, falhas: 0, detalhes: [] },
        notificacoes_vencido: { sucessos: 0, falhas: 0, detalhes: [] }
      };

      // Processar cada tipo de notificação
      await this.processarNotificacoes3Dias(resultados.notificacoes_3_dias);
      await this.processarNotificacoesNoDia(resultados.notificacoes_no_dia);
      await this.processarNotificacoesVencido(resultados.notificacoes_vencido);

      const fim = new Date();
      const duracao = (fim - inicio) / 1000;

      const totalSucessos = resultados.notificacoes_3_dias.sucessos + 
                           resultados.notificacoes_no_dia.sucessos + 
                           resultados.notificacoes_vencido.sucessos;
      const totalFalhas = resultados.notificacoes_3_dias.falhas + 
                         resultados.notificacoes_no_dia.falhas + 
                         resultados.notificacoes_vencido.falhas;

      console.log(`✅ [JOB NOTIFICAÇÕES] Job finalizado em ${duracao}s`);
      console.log(`📊 [JOB NOTIFICAÇÕES] Resultados:`);
      console.log(`   - 3 dias antes: ${resultados.notificacoes_3_dias.sucessos} sucessos, ${resultados.notificacoes_3_dias.falhas} falhas`);
      console.log(`   - No dia: ${resultados.notificacoes_no_dia.sucessos} sucessos, ${resultados.notificacoes_no_dia.falhas} falhas`);
      console.log(`   - Vencido: ${resultados.notificacoes_vencido.sucessos} sucessos, ${resultados.notificacoes_vencido.falhas} falhas`);
      console.log(`   - Total: ${totalSucessos} sucessos, ${totalFalhas} falhas`);

      return {
        sucesso: true,
        duracao,
        resultados
      };

    } catch (error) {
      console.error('❌ [JOB NOTIFICAÇÕES] Erro fatal no job:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Processa notificações para boletos que vencem em 3 dias
   */
  async processarNotificacoes3Dias(resultados) {
    try {
      const hoje = this.obterDataHoje();
      const dataVencimento = this.adicionarDias(hoje, 3);

      console.log(`📅 [NOTIFICAÇÕES] Buscando boletos que vencem em 3 dias`);
      console.log(`   - Hoje: ${hoje}`);
      console.log(`   - Data vencimento (hoje + 3): ${dataVencimento}`);

      const { data: boletos, error } = await supabaseAdmin
        .from('boletos_gestao')
        .select(`
          *,
          pacientes!paciente_id(
            id,
            nome,
            telefone
          )
        `)
        .eq('data_vencimento', dataVencimento)
        .eq('notificado_3_dias', false)
        .neq('status', 'pago')
        .neq('status', 'cancelado')
        .limit(100);

      if (error) {
        throw new Error(`Erro ao buscar boletos: ${error.message}`);
      }

      if (!boletos || boletos.length === 0) {
        console.log('✅ [NOTIFICAÇÕES] Nenhum boleto para notificar (3 dias antes)');
        // Log adicional para debug
        const { data: todosBoletos } = await supabaseAdmin
          .from('boletos_gestao')
          .select('id, data_vencimento, notificado_3_dias, status, url_boleto')
          .eq('data_vencimento', dataVencimento)
          .limit(5);
        if (todosBoletos && todosBoletos.length > 0) {
          console.log(`   ⚠️ [DEBUG] Encontrados ${todosBoletos.length} boletos com essa data, mas não atendem aos critérios:`);
          todosBoletos.forEach(b => {
            console.log(`      - Boleto ${b.id}: notificado_3_dias=${b.notificado_3_dias}, status=${b.status}, tem_url=${!!b.url_boleto}`);
          });
        }
        return;
      }

      console.log(`📋 [NOTIFICAÇÕES] ${boletos.length} boletos encontrados para notificar (3 dias antes)`);
      boletos.forEach(b => {
        const paciente = Array.isArray(b.pacientes) ? b.pacientes[0] : b.pacientes;
        console.log(`   - Boleto ${b.id}: Paciente ${paciente?.nome || 'N/A'}, Telefone ${paciente?.telefone || 'N/A'}`);
      });

      for (const boleto of boletos) {
        await this.enviarNotificacao(boleto, '3_dias', resultados);
        await this.aguardar(1000); // Aguardar 1 segundo entre envios
      }

    } catch (error) {
      console.error('❌ [NOTIFICAÇÕES] Erro ao processar notificações 3 dias:', error);
      throw error;
    }
  }

  /**
   * Processa notificações para boletos que vencem hoje
   */
  async processarNotificacoesNoDia(resultados) {
    try {
      const hoje = this.obterDataHoje();

      console.log(`📅 [NOTIFICAÇÕES] Buscando boletos que vencem hoje (${hoje})`);

      const { data: boletos, error } = await supabaseAdmin
        .from('boletos_gestao')
        .select(`
          *,
          pacientes!paciente_id(
            id,
            nome,
            telefone
          )
        `)
        .eq('data_vencimento', hoje)
        .eq('notificado_no_dia', false)
        .neq('status', 'pago')
        .neq('status', 'cancelado')
        .limit(100);

      if (error) {
        throw new Error(`Erro ao buscar boletos: ${error.message}`);
      }

      if (!boletos || boletos.length === 0) {
        console.log('✅ [NOTIFICAÇÕES] Nenhum boleto para notificar (no dia)');
        // Log adicional para debug
        const { data: todosBoletos } = await supabaseAdmin
          .from('boletos_gestao')
          .select('id, data_vencimento, notificado_no_dia, status, url_boleto')
          .eq('data_vencimento', hoje)
          .limit(5);
        if (todosBoletos && todosBoletos.length > 0) {
          console.log(`   ⚠️ [DEBUG] Encontrados ${todosBoletos.length} boletos com essa data, mas não atendem aos critérios:`);
          todosBoletos.forEach(b => {
            console.log(`      - Boleto ${b.id}: notificado_no_dia=${b.notificado_no_dia}, status=${b.status}, tem_url=${!!b.url_boleto}`);
          });
        }
        return;
      }

      console.log(`📋 [NOTIFICAÇÕES] ${boletos.length} boletos encontrados para notificar (no dia)`);
      boletos.forEach(b => {
        const paciente = Array.isArray(b.pacientes) ? b.pacientes[0] : b.pacientes;
        console.log(`   - Boleto ${b.id}: Paciente ${paciente?.nome || 'N/A'}, Telefone ${paciente?.telefone || 'N/A'}`);
      });

      for (const boleto of boletos) {
        await this.enviarNotificacao(boleto, 'no_dia', resultados);
        await this.aguardar(1000); // Aguardar 1 segundo entre envios
      }

    } catch (error) {
      console.error('❌ [NOTIFICAÇÕES] Erro ao processar notificações no dia:', error);
      throw error;
    }
  }

  /**
   * Processa notificações para boletos vencidos
   */
  async processarNotificacoesVencido(resultados) {
    try {
      const hoje = this.obterDataHoje();

      console.log(`📅 [NOTIFICAÇÕES] Buscando boletos vencidos (antes de ${hoje})`);

      const { data: boletos, error } = await supabaseAdmin
        .from('boletos_gestao')
        .select(`
          *,
          pacientes!paciente_id(
            id,
            nome,
            telefone
          )
        `)
        .lt('data_vencimento', hoje)
        .eq('notificado_vencido', false)
        .neq('status', 'pago')
        .neq('status', 'cancelado')
        .limit(100);

      if (error) {
        throw new Error(`Erro ao buscar boletos: ${error.message}`);
      }

      if (!boletos || boletos.length === 0) {
        console.log('✅ [NOTIFICAÇÕES] Nenhum boleto para notificar (vencido)');
        return;
      }

      console.log(`📋 [NOTIFICAÇÕES] ${boletos.length} boletos encontrados para notificar (vencido)`);

      for (const boleto of boletos) {
        await this.enviarNotificacao(boleto, 'vencido', resultados);
        await this.aguardar(1000); // Aguardar 1 segundo entre envios
      }

    } catch (error) {
      console.error('❌ [NOTIFICAÇÕES] Erro ao processar notificações vencido:', error);
      throw error;
    }
  }

  /**
   * Envia notificação para um boleto
   * @param {Object} boleto - Dados do boleto
   * @param {string} tipoNotificacao - Tipo: '3_dias', 'no_dia', 'vencido'
   * @param {Object} resultados - Objeto para armazenar resultados
   */
  async enviarNotificacao(boleto, tipoNotificacao, resultados) {
    try {
      // Validar se paciente tem telefone
      const paciente = Array.isArray(boleto.pacientes) ? boleto.pacientes[0] : boleto.pacientes;
      
      if (!paciente || !paciente.telefone) {
        const erro = 'Paciente sem telefone cadastrado';
        console.log(`⚠️ [NOTIFICAÇÕES] Boleto ${boleto.id}: ${erro}`);
        resultados.falhas++;
        resultados.detalhes.push({
          boleto_id: boleto.id,
          tipo: tipoNotificacao,
          sucesso: false,
          erro
        });
        return;
      }

      // Validar se boleto tem URL (foi gerado)
      if (!boleto.url_boleto) {
        const erro = 'Boleto ainda não foi gerado (sem URL)';
        console.log(`⚠️ [NOTIFICAÇÕES] Boleto ${boleto.id}: ${erro}`);
        resultados.falhas++;
        resultados.detalhes.push({
          boleto_id: boleto.id,
          tipo: tipoNotificacao,
          sucesso: false,
          erro
        });
        return;
      }

      // Formatar e enviar mensagem
      let mensagem;
      switch (tipoNotificacao) {
        case '3_dias':
          mensagem = zApiService.formatarMensagem3DiasAntes(boleto, paciente);
          break;
        case 'no_dia':
          mensagem = zApiService.formatarMensagemNoDia(boleto, paciente);
          break;
        case 'vencido':
          mensagem = zApiService.formatarMensagemVencido(boleto, paciente);
          break;
        default:
          throw new Error(`Tipo de notificação inválido: ${tipoNotificacao}`);
      }

      console.log(`📤 [NOTIFICAÇÕES] Enviando notificação ${tipoNotificacao} para boleto ${boleto.id}`);
      const resultado = await zApiService.enviarMensagemTexto(paciente.telefone, mensagem);

      if (resultado.success) {
        // Atualizar flag de notificação
        const campoFlag = this.obterCampoFlag(tipoNotificacao);
        const { error: updateError } = await supabaseAdmin
          .from('boletos_gestao')
          .update({
            [campoFlag]: true,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', boleto.id);

        if (updateError) {
          console.error(`❌ [NOTIFICAÇÕES] Erro ao atualizar flag do boleto ${boleto.id}:`, updateError);
          resultados.falhas++;
          resultados.detalhes.push({
            boleto_id: boleto.id,
            tipo: tipoNotificacao,
            sucesso: false,
            erro: 'Mensagem enviada mas erro ao atualizar flag',
            messageId: resultado.messageId
          });
        } else {
          console.log(`✅ [NOTIFICAÇÕES] Notificação ${tipoNotificacao} enviada com sucesso para boleto ${boleto.id}`);
          resultados.sucessos++;
          resultados.detalhes.push({
            boleto_id: boleto.id,
            tipo: tipoNotificacao,
            sucesso: true,
            messageId: resultado.messageId
          });
        }
      } else {
        console.error(`❌ [NOTIFICAÇÕES] Erro ao enviar notificação ${tipoNotificacao} para boleto ${boleto.id}:`, resultado.error);
        resultados.falhas++;
        resultados.detalhes.push({
          boleto_id: boleto.id,
          tipo: tipoNotificacao,
          sucesso: false,
          erro: resultado.error
        });
      }

    } catch (error) {
      console.error(`❌ [NOTIFICAÇÕES] Erro ao processar notificação ${tipoNotificacao} para boleto ${boleto.id}:`, error);
      resultados.falhas++;
      resultados.detalhes.push({
        boleto_id: boleto.id,
        tipo: tipoNotificacao,
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * Obtém o nome do campo de flag baseado no tipo de notificação
   */
  obterCampoFlag(tipoNotificacao) {
    const flags = {
      '3_dias': 'notificado_3_dias',
      'no_dia': 'notificado_no_dia',
      'vencido': 'notificado_vencido'
    };
    return flags[tipoNotificacao] || null;
  }

  /**
   * Obtém a data de hoje no formato YYYY-MM-DD (sem horas, timezone local)
   */
  obterDataHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  /**
   * Adiciona dias a uma data e retorna no formato YYYY-MM-DD (timezone local)
   */
  adicionarDias(dataString, dias) {
    // Se a data vier no formato YYYY-MM-DD, criar no timezone local
    if (typeof dataString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
      const [ano, mes, dia] = dataString.split('-').map(Number);
      const data = new Date(ano, mes - 1, dia);
      data.setDate(data.getDate() + dias);
      const anoResult = data.getFullYear();
      const mesResult = String(data.getMonth() + 1).padStart(2, '0');
      const diaResult = String(data.getDate()).padStart(2, '0');
      return `${anoResult}-${mesResult}-${diaResult}`;
    }
    // Para outros formatos, usar conversão padrão
    const data = new Date(dataString);
    data.setDate(data.getDate() + dias);
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  /**
   * Calcula dias até o vencimento (considerando apenas datas, sem horas, timezone local)
   */
  calcularDiasAteVencimento(dataVencimento) {
    const hoje = new Date();
    const hojeLocal = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    
    // Se a data vier no formato YYYY-MM-DD, criar no timezone local
    let vencimentoLocal;
    if (typeof dataVencimento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataVencimento)) {
      const [ano, mes, dia] = dataVencimento.split('-').map(Number);
      vencimentoLocal = new Date(ano, mes - 1, dia);
    } else {
      const vencimento = new Date(dataVencimento);
      vencimentoLocal = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
    }
    
    const diffTime = vencimentoLocal - hojeLocal;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Aguarda um tempo em milissegundos
   */
  aguardar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executa o job periodicamente
   */
  iniciarScheduler(intervaloHoras = 2) {
    console.log(`🕐 [JOB NOTIFICAÇÕES] Scheduler iniciado - Executando a cada ${intervaloHoras} horas`);
    console.log(`🕐 [JOB NOTIFICAÇÕES] Intervalo em milissegundos: ${intervaloHoras * 60 * 60 * 1000}ms`);
    
    // Executar imediatamente após um pequeno delay para garantir que o servidor está pronto
    setTimeout(() => {
      console.log(`🚀 [JOB NOTIFICAÇÕES] Executando primeira execução imediata...`);
      this.executar()
        .then(() => {
          console.log(`✅ [JOB NOTIFICAÇÕES] Primeira execução concluída com sucesso`);
        })
        .catch((error) => {
          console.error(`❌ [JOB NOTIFICAÇÕES] Erro na primeira execução:`, error);
        });
    }, 5000); // Aguardar 5 segundos após o servidor iniciar
    
    // Executar periodicamente
    const intervaloMs = intervaloHoras * 60 * 60 * 1000;
    setInterval(() => {
      console.log(`⏰ [JOB NOTIFICAÇÕES] Executando job agendado (intervalo de ${intervaloHoras}h)...`);
      this.executar()
        .then(() => {
          console.log(`✅ [JOB NOTIFICAÇÕES] Execução agendada concluída com sucesso`);
        })
        .catch((error) => {
          console.error(`❌ [JOB NOTIFICAÇÕES] Erro na execução agendada:`, error);
        });
    }, intervaloMs);
    
    console.log(`✅ [JOB NOTIFICAÇÕES] Scheduler configurado com sucesso`);
  }
}

// Exportar instância única
const enviadorNotificacoes = new EnviadorNotificacoesBoletos();

module.exports = enviadorNotificacoes;

// Se executado diretamente, rodar o job uma vez
if (require.main === module) {
  console.log('🚀 Executando job de envio de notificações...');
  enviadorNotificacoes.executar()
    .then(resultado => {
      console.log('✅ Job concluído:', resultado);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro no job:', error);
      process.exit(1);
    });
}

