const { supabaseAdmin } = require('../config/database');

/**
 * Job para atualizar status de boletos para "vencido" quando a data de vencimento passar
 * Deve ser executado periodicamente (diariamente ou algumas vezes por dia)
 */
class AtualizadorStatusBoletos {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Executa o job de atualização de status
   */
  async executar() {
    if (this.isRunning) {
      console.log('⚠️ [JOB STATUS] Job já está em execução');
      return;
    }

    this.isRunning = true;
    const inicio = new Date();
    console.log(`🚀 [JOB STATUS] Iniciando atualização de status de boletos - ${inicio.toISOString()}`);

    try {
      const hoje = this.obterDataHoje();
      console.log(`📅 [JOB STATUS] Data de hoje: ${hoje}`);

      const resultados = {
        boletos_gestao: { atualizados: 0, erros: 0 },
        boletos_caixa: { atualizados: 0, erros: 0 }
      };

      // Atualizar boletos_gestao
      await this.atualizarBoletosGestao(hoje, resultados.boletos_gestao);

      // Atualizar boletos_caixa
      await this.atualizarBoletosCaixa(hoje, resultados.boletos_caixa);

      const fim = new Date();
      const duracao = (fim - inicio) / 1000;

      console.log(`✅ [JOB STATUS] Job finalizado em ${duracao}s`);
      console.log(`📊 [JOB STATUS] Resultados:`);
      console.log(`   - boletos_gestao: ${resultados.boletos_gestao.atualizados} atualizados, ${resultados.boletos_gestao.erros} erros`);
      console.log(`   - boletos_caixa: ${resultados.boletos_caixa.atualizados} atualizados, ${resultados.boletos_caixa.erros} erros`);

      return {
        sucesso: true,
        duracao,
        resultados
      };

    } catch (error) {
      console.error('❌ [JOB STATUS] Erro fatal no job:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Atualiza status de boletos na tabela boletos_gestao
   */
  async atualizarBoletosGestao(hoje, resultados) {
    try {
      console.log(`🔄 [JOB STATUS] Atualizando boletos_gestao...`);

      // Buscar boletos que estão vencidos mas não têm status "vencido"
      const { data: boletosVencidos, error: selectError } = await supabaseAdmin
        .from('boletos_gestao')
        .select('id, data_vencimento, status')
        .lt('data_vencimento', hoje)
        .neq('status', 'vencido')
        .neq('status', 'pago')
        .neq('status', 'cancelado');

      if (selectError) {
        throw new Error(`Erro ao buscar boletos_gestao: ${selectError.message}`);
      }

      if (!boletosVencidos || boletosVencidos.length === 0) {
        console.log('✅ [JOB STATUS] Nenhum boleto_gestao para atualizar');
        return;
      }

      console.log(`📋 [JOB STATUS] ${boletosVencidos.length} boletos_gestao encontrados para atualizar`);

      // Atualizar todos os boletos de uma vez
      const ids = boletosVencidos.map(b => b.id);
      const { error: updateError, count } = await supabaseAdmin
        .from('boletos_gestao')
        .update({
          status: 'vencido',
          atualizado_em: new Date().toISOString()
        })
        .in('id', ids);

      if (updateError) {
        throw new Error(`Erro ao atualizar boletos_gestao: ${updateError.message}`);
      }

      resultados.atualizados = boletosVencidos.length;
      console.log(`✅ [JOB STATUS] ${resultados.atualizados} boletos_gestao atualizados para "vencido"`);

    } catch (error) {
      console.error('❌ [JOB STATUS] Erro ao atualizar boletos_gestao:', error);
      resultados.erros++;
      throw error;
    }
  }

  /**
   * Atualiza status de boletos na tabela boletos_caixa
   */
  async atualizarBoletosCaixa(hoje, resultados) {
    try {
      console.log(`🔄 [JOB STATUS] Atualizando boletos_caixa...`);

      // Buscar boletos que estão vencidos mas não têm status "vencido"
      const { data: boletosVencidos, error: selectError } = await supabaseAdmin
        .from('boletos_caixa')
        .select('id, data_vencimento, status')
        .lt('data_vencimento', hoje)
        .neq('status', 'vencido')
        .neq('status', 'pago')
        .neq('status', 'cancelado');

      if (selectError) {
        throw new Error(`Erro ao buscar boletos_caixa: ${selectError.message}`);
      }

      if (!boletosVencidos || boletosVencidos.length === 0) {
        console.log('✅ [JOB STATUS] Nenhum boleto_caixa para atualizar');
        return;
      }

      console.log(`📋 [JOB STATUS] ${boletosVencidos.length} boletos_caixa encontrados para atualizar`);

      // Atualizar todos os boletos de uma vez
      const ids = boletosVencidos.map(b => b.id);
      const { error: updateError } = await supabaseAdmin
        .from('boletos_caixa')
        .update({
          status: 'vencido'
        })
        .in('id', ids);

      if (updateError) {
        throw new Error(`Erro ao atualizar boletos_caixa: ${updateError.message}`);
      }

      resultados.atualizados = boletosVencidos.length;
      console.log(`✅ [JOB STATUS] ${resultados.atualizados} boletos_caixa atualizados para "vencido"`);

    } catch (error) {
      console.error('❌ [JOB STATUS] Erro ao atualizar boletos_caixa:', error);
      resultados.erros++;
      throw error;
    }
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
   * Executa o job periodicamente
   */
  iniciarScheduler(intervaloHoras = 6) {
    console.log(`🕐 [JOB STATUS] Scheduler iniciado - Executando a cada ${intervaloHoras} horas`);
    
    // Executar imediatamente
    this.executar().catch(console.error);
    
    // Executar periodicamente
    setInterval(() => {
      this.executar().catch(console.error);
    }, intervaloHoras * 60 * 60 * 1000);
  }
}

// Exportar instância única
const atualizadorStatus = new AtualizadorStatusBoletos();

module.exports = atualizadorStatus;

// Se executado diretamente, rodar o job uma vez
if (require.main === module) {
  console.log('🚀 Executando job de atualização de status de boletos...');
  atualizadorStatus.executar()
    .then(resultado => {
      console.log('✅ Job concluído:', resultado);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro no job:', error);
      process.exit(1);
    });
}