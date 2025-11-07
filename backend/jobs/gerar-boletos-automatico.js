const { supabaseAdmin } = require('../config/database');
const { criarBoletosCaixa } = require('../utils/caixa-boletos.helper');

/**
 * Job para gerar boletos automaticamente
 * Deve ser executado diariamente (via cron ou scheduler)
 */
class GeradorBoletosAutomatico {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Executa o job de geração de boletos
   */
  async executar() {
    if (this.isRunning) {
      console.log('⚠️ [JOB BOLETOS] Job já está em execução');
      return;
    }

    this.isRunning = true;
    const inicio = new Date();
    console.log(`🚀 [JOB BOLETOS] Iniciando geração automática de boletos - ${inicio.toISOString()}`);

    try {
      // Buscar boletos que devem ser gerados hoje
      const { data: boletosParaGerar, error: queryError } = await supabaseAdmin
        .from('boletos_gestao')
        .select(`
          *,
          pacientes!paciente_id(
            id,
            nome,
            cpf,
            telefone,
            endereco,
            bairro,
            numero,
            cep,
            cidade,
            estado
          ),
          fechamentos!fechamento_id(
            id,
            numero_parcelas,
            valor_parcela,
            vencimento
          )
        `)
        .eq('gerar_boleto', true)
        .eq('boleto_gerado', false)
        .eq('empresa_id', 3) // Apenas Caixa
        .lte('data_vencimento', this.calcularDataLimite())
        .in('status', ['pendente'])
        .limit(50); // Processar em lotes de 50

      if (queryError) {
        throw new Error(`Erro ao buscar boletos: ${queryError.message}`);
      }

      if (!boletosParaGerar || boletosParaGerar.length === 0) {
        console.log('✅ [JOB BOLETOS] Nenhum boleto pendente para geração');
        return {
          sucesso: true,
          mensagem: 'Nenhum boleto pendente',
          processados: 0
        };
      }

      console.log(`📋 [JOB BOLETOS] ${boletosParaGerar.length} boletos encontrados para processar`);

      const resultados = [];
      let sucessos = 0;
      let falhas = 0;

      // Processar cada boleto
      for (const boleto of boletosParaGerar) {
        try {
          const resultado = await this.gerarBoleto(boleto);
          
          if (resultado.sucesso) {
            sucessos++;
            console.log(`✅ [JOB BOLETOS] Boleto ${boleto.id} gerado com sucesso`);
          } else {
            falhas++;
            console.error(`❌ [JOB BOLETOS] Falha ao gerar boleto ${boleto.id}: ${resultado.erro}`);
          }
          
          resultados.push(resultado);
          
          // Aguardar um pouco entre requisições para não sobrecarregar a API
          await this.aguardar(500);
          
        } catch (error) {
          falhas++;
          console.error(`❌ [JOB BOLETOS] Erro ao processar boleto ${boleto.id}:`, error);
          resultados.push({
            boleto_id: boleto.id,
            sucesso: false,
            erro: error.message
          });
        }
      }

      const fim = new Date();
      const duracao = (fim - inicio) / 1000;

      console.log(`✅ [JOB BOLETOS] Job finalizado em ${duracao}s`);
      console.log(`📊 [JOB BOLETOS] Resultados: ${sucessos} sucessos, ${falhas} falhas`);

      return {
        sucesso: true,
        duracao,
        processados: boletosParaGerar.length,
        sucessos,
        falhas,
        resultados
      };

    } catch (error) {
      console.error('❌ [JOB BOLETOS] Erro fatal no job:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Gera um boleto individual na Caixa
   */
  async gerarBoleto(boleto) {
    try {
      // Validar dados necessários
      if (!boleto.pacientes || !boleto.pacientes.cpf) {
        return {
          boleto_id: boleto.id,
          sucesso: false,
          erro: 'Paciente sem CPF cadastrado'
        };
      }

      // Criar objeto de fechamento fake para compatibilidade com o helper
      const fechamentoFake = {
        id: boleto.fechamento_id,
        numero_parcelas: 1,
        valor_parcela: boleto.valor,
        vencimento: boleto.data_vencimento,
        paciente_id: boleto.paciente_id,
        clinica_id: boleto.clinica_id,
        empresa_id: boleto.empresa_id
      };

      // Dados do paciente
      const paciente = {
        ...boleto.pacientes,
        id: boleto.paciente_id
      };

      // ID do beneficiário
      const idBeneficiario = process.env.CAIXA_ID_BENEFICIARIO;
      if (!idBeneficiario) {
        return {
          boleto_id: boleto.id,
          sucesso: false,
          erro: 'ID do beneficiário não configurado'
        };
      }

      // Gerar boleto na Caixa
      console.log(`🏦 [JOB BOLETOS] Gerando boleto ${boleto.id} na Caixa...`);
      const boletosCriados = await criarBoletosCaixa(
        fechamentoFake,
        paciente,
        idBeneficiario
      );

      if (!boletosCriados || boletosCriados.length === 0) {
        return {
          boleto_id: boleto.id,
          sucesso: false,
          erro: 'Falha ao gerar boleto na API Caixa'
        };
      }

      const boletoCriado = boletosCriados[0];

      // Atualizar boleto no banco com os dados da Caixa
      const { error: updateError } = await supabaseAdmin
        .from('boletos_gestao')
        .update({
          boleto_gerado: true,
          data_geracao_boleto: new Date().toISOString(),
          boleto_caixa_id: boletoCriado.id,
          nosso_numero: boletoCriado.nosso_numero,
          numero_documento: boletoCriado.numero_documento,
          linha_digitavel: boletoCriado.linha_digitavel,
          codigo_barras: boletoCriado.codigo_barras,
          url_boleto: boletoCriado.url,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', boleto.id);

      if (updateError) {
        console.error(`❌ [JOB BOLETOS] Erro ao atualizar boleto ${boleto.id}:`, updateError);
        // Boleto foi gerado mas não conseguimos atualizar o banco
        return {
          boleto_id: boleto.id,
          sucesso: false,
          erro: 'Boleto gerado mas erro ao atualizar banco de dados',
          nosso_numero: boletoCriado.nosso_numero
        };
      }

      return {
        boleto_id: boleto.id,
        sucesso: true,
        nosso_numero: boletoCriado.nosso_numero,
        linha_digitavel: boletoCriado.linha_digitavel
      };

    } catch (error) {
      console.error(`❌ [JOB BOLETOS] Erro ao gerar boleto ${boleto.id}:`, error);
      return {
        boleto_id: boleto.id,
        sucesso: false,
        erro: error.message
      };
    }
  }

  /**
   * Calcula a data limite para geração de boletos
   * (data atual + dias configurados para cada boleto)
   */
  calcularDataLimite() {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 20); // Máximo de 20 dias no futuro
    return hoje.toISOString().split('T')[0];
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
  iniciarScheduler(intervaloMinutos = 60) {
    console.log(`🕐 [JOB BOLETOS] Scheduler iniciado - Executando a cada ${intervaloMinutos} minutos`);
    
    // Executar imediatamente
    this.executar().catch(console.error);
    
    // Executar periodicamente
    setInterval(() => {
      this.executar().catch(console.error);
    }, intervaloMinutos * 60 * 1000);
  }
}

// Exportar instância única
const geradorBoletos = new GeradorBoletosAutomatico();

module.exports = geradorBoletos;

// Se executado diretamente, rodar o job uma vez
if (require.main === module) {
  console.log('🚀 Executando job de geração de boletos...');
  geradorBoletos.executar()
    .then(resultado => {
      console.log('✅ Job concluído:', resultado);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro no job:', error);
      process.exit(1);
    });
}

