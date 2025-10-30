const { supabase, supabaseAdmin } = require('../config/database');
const caixaBoletoService = require('../services/caixa-boleto.service');

/**
 * Criar boletos na Caixa para um fechamento
 * @param {Object} fechamento - Dados do fechamento criado
 * @param {Object} paciente - Dados do paciente
 * @param {String} idBeneficiario - ID do beneficiário na Caixa
 * @returns {Array} Array de boletos criados
 */
async function criarBoletosCaixa(fechamento, paciente, idBeneficiario) {
  const boletosCriados = [];
  
  try {
    // Verificar se tem dados necessários
    if (!paciente.cpf || !paciente.nome) {
      console.warn('⚠️ Paciente sem CPF ou nome. Não é possível criar boleto.');
      return boletosCriados;
    }

    if (!idBeneficiario) {
      console.warn('⚠️ ID do beneficiário não configurado. Configure CAIXA_ID_BENEFICIARIO no .env');
      return boletosCriados;
    }

    // Normalizar ID do beneficiário (pode vir como "0374/1242669" ou apenas "1242669")
    const idBeneficiarioNormalizado = idBeneficiario.includes('/') 
      ? idBeneficiario.split('/')[1].trim() 
      : idBeneficiario.trim();

    // Preparar dados do pagador
    const dadosPagador = {
      pagador_cpf: paciente.cpf.replace(/\D/g, ''), // Apenas números
      pagador_nome: paciente.nome,
      pagador_cidade: paciente.cidade || '',
      pagador_uf: paciente.estado || '',
      pagador_cep: '', // Se tiver no banco, usar aqui
      pagador_logradouro: '', // Se tiver no banco, usar aqui
      pagador_numero: '',
      pagador_bairro: '',
      pagador_complemento: ''
    };

    // Se tem parcelamento, criar um boleto por parcela
    if (fechamento.numero_parcelas && fechamento.numero_parcelas > 0 && fechamento.valor_parcela) {
      console.log(`📦 Criando ${fechamento.numero_parcelas} boletos para fechamento ${fechamento.id}`);
      
      // Validar que tem data de vencimento para parcelamento
      if (!fechamento.vencimento) {
        console.error('❌ Erro: Parcelamento requer data de vencimento');
        throw new Error('Data de vencimento é obrigatória para parcelamento');
      }
      
      const dataVencimentoBase = new Date(fechamento.vencimento);
      if (isNaN(dataVencimentoBase.getTime())) {
        console.error('❌ Erro: Data de vencimento inválida:', fechamento.vencimento);
        throw new Error('Data de vencimento inválida');
      }
      
      for (let i = 0; i < fechamento.numero_parcelas; i++) {
        try {
          // Calcular data de vencimento da parcela (somando meses a partir da data base)
          const dataVencimento = new Date(dataVencimentoBase);
          dataVencimento.setMonth(dataVencimento.getMonth() + i);
          
          const numeroDocumento = `FEC-${fechamento.id}-P${i + 1}`;
          
          // Criar boleto na Caixa
          const resultadoBoleto = await caixaBoletoService.criarBoleto({
            id_beneficiario: idBeneficiarioNormalizado,
            numero_documento: numeroDocumento,
            data_vencimento: dataVencimento.toISOString().split('T')[0], // YYYY-MM-DD
            valor: parseFloat(fechamento.valor_parcela),
            descricao: `Parcela ${i + 1} de ${fechamento.numero_parcelas} - Fechamento ${fechamento.id}`,
            instrucoes: ['Não receber após o vencimento'],
            ...dadosPagador
          });

          // Salvar boleto no banco
          const { data: boletoSalvo, error: boletoError } = await supabaseAdmin
            .from('boletos_caixa')
            .insert([{
              paciente_id: paciente.id,
              fechamento_id: fechamento.id,
              id_beneficiario: idBeneficiarioNormalizado,
              nosso_numero: resultadoBoleto.nosso_numero,
              numero_documento: numeroDocumento,
              codigo_barras: resultadoBoleto.codigo_barras,
              linha_digitavel: resultadoBoleto.linha_digitavel,
              url: resultadoBoleto.url,
              qrcode: resultadoBoleto.qrcode,
              url_qrcode: resultadoBoleto.url_qrcode,
              valor: parseFloat(fechamento.valor_parcela),
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              data_emissao: new Date().toISOString().split('T')[0],
              situacao: 'EM ABERTO',
              status: 'pendente',
              empresa_id: fechamento.empresa_id,
              parcela_numero: i + 1,
              sincronizado_em: new Date().toISOString()
            }])
            .select()
            .single();

          if (boletoError) {
            console.error(`❌ Erro ao salvar boleto ${i + 1}:`, boletoError);
            throw boletoError;
          }

          boletosCriados.push(boletoSalvo);
          console.log(`✅ Boleto ${i + 1}/${fechamento.numero_parcelas} criado:`, resultadoBoleto.nosso_numero);
          
          // Pequeno delay entre criações para respeitar rate limit
          if (i < fechamento.numero_parcelas - 1) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms entre requisições
          }
        } catch (error) {
          console.error(`❌ Erro ao criar boleto ${i + 1}:`, error.response?.data || error.message);
          
          // Salvar erro no banco para debug
          const dataVencimentoErro = new Date(fechamento.vencimento);
          dataVencimentoErro.setMonth(dataVencimentoErro.getMonth() + i);
          
          await supabaseAdmin
            .from('boletos_caixa')
            .insert([{
              paciente_id: paciente.id,
              fechamento_id: fechamento.id,
              id_beneficiario: idBeneficiarioNormalizado,
              numero_documento: `FEC-${fechamento.id}-P${i + 1}`,
              valor: parseFloat(fechamento.valor_parcela),
              data_vencimento: dataVencimentoErro.toISOString().split('T')[0],
              empresa_id: fechamento.empresa_id,
              parcela_numero: i + 1,
              tentativas_criacao: 1,
              erro_criacao: error.response?.data?.mensagem || error.message,
              situacao: 'ERRO',
              status: 'erro'
            }]);
          
          // Continuar criando outros boletos mesmo se um falhar
        }
      }
    } else if (fechamento.valor_fechado) {
      // Fechamento sem parcelamento - criar um único boleto
      try {
        console.log(`📦 Criando boleto único para fechamento ${fechamento.id}`);
        
        // Usar vencimento se fornecido, senão usar data_fechamento + 30 dias como fallback
        let dataVencimento;
        if (fechamento.vencimento) {
          dataVencimento = new Date(fechamento.vencimento);
          if (isNaN(dataVencimento.getTime())) {
            console.warn('⚠️ Data de vencimento inválida, usando fallback');
            dataVencimento = new Date(fechamento.data_fechamento);
            dataVencimento.setDate(dataVencimento.getDate() + 30); // Adicionar 30 dias
          }
        } else {
          // Fallback: usar data_fechamento + 30 dias
          dataVencimento = new Date(fechamento.data_fechamento || new Date());
          dataVencimento.setDate(dataVencimento.getDate() + 30);
          console.warn('⚠️ Data de vencimento não informada, usando data_fechamento + 30 dias');
        }
        
        const numeroDocumento = `FEC-${fechamento.id}`;
        
        // Criar boleto na Caixa
        const resultadoBoleto = await caixaBoletoService.criarBoleto({
          id_beneficiario: idBeneficiarioNormalizado,
          numero_documento: numeroDocumento,
          data_vencimento: dataVencimento.toISOString().split('T')[0], // YYYY-MM-DD
          valor: parseFloat(fechamento.valor_fechado),
          descricao: `Fechamento ${fechamento.id}`,
          instrucoes: ['Não receber após o vencimento'],
          ...dadosPagador
        });

        // Salvar boleto no banco
        const { data: boletoSalvo, error: boletoError } = await supabaseAdmin
          .from('boletos_caixa')
          .insert([{
            paciente_id: paciente.id,
            fechamento_id: fechamento.id,
            id_beneficiario: idBeneficiario,
            nosso_numero: resultadoBoleto.nosso_numero,
            numero_documento: numeroDocumento,
            codigo_barras: resultadoBoleto.codigo_barras,
            linha_digitavel: resultadoBoleto.linha_digitavel,
            url: resultadoBoleto.url,
            qrcode: resultadoBoleto.qrcode,
            url_qrcode: resultadoBoleto.url_qrcode,
            valor: parseFloat(fechamento.valor_fechado),
            data_vencimento: dataVencimento ? new Date(dataVencimento).toISOString().split('T')[0] : null,
            data_emissao: new Date().toISOString().split('T')[0],
            situacao: 'EM ABERTO',
            status: 'pendente',
            empresa_id: fechamento.empresa_id,
            sincronizado_em: new Date().toISOString()
          }])
          .select()
          .single();

        if (boletoError) {
          console.error('❌ Erro ao salvar boleto:', boletoError);
          throw boletoError;
        }

        boletosCriados.push(boletoSalvo);
        console.log(`✅ Boleto criado:`, resultadoBoleto.nosso_numero);
      } catch (error) {
        console.error('❌ Erro ao criar boleto:', error.response?.data || error.message);
        
        // Salvar erro no banco para debug
        await supabaseAdmin
          .from('boletos_caixa')
          .insert([{
            paciente_id: paciente.id,
            fechamento_id: fechamento.id,
            id_beneficiario: idBeneficiario,
            numero_documento: `FEC-${fechamento.id}`,
            valor: parseFloat(fechamento.valor_fechado),
            data_vencimento: fechamento.vencimento || fechamento.data_fechamento,
            empresa_id: fechamento.empresa_id,
            tentativas_criacao: 1,
            erro_criacao: error.response?.data?.mensagem || error.message,
            situacao: 'ERRO',
            status: 'erro'
          }]);
      }
    }

    return boletosCriados;
  } catch (error) {
    console.error('❌ Erro geral ao criar boletos:', error);
    return boletosCriados;
  }
}

module.exports = {
  criarBoletosCaixa
};

