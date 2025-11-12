const { supabase, supabaseAdmin } = require('../config/database');
const caixaBoletoService = require('../services/caixa-boleto.service');

/**
 * Criar registro em boletos_gestao quando um boleto é criado em boletos_caixa
 * @param {Object} boletoCaixa - Boleto criado em boletos_caixa
 * @param {Object} fechamento - Dados do fechamento
 * @param {Number} parcelaNumero - Número da parcela (padrão: 1)
 * @param {String} urlBoletoPublica - URL pública do boleto
 * @param {String} numeroDocumento - Número do documento
 */
async function criarBoletoGestao(boletoCaixa, fechamento, parcelaNumero = 1, urlBoletoPublica = null, numeroDocumento = null) {
  try {
    // Verificar se já existe em boletos_gestao
    const { data: boletoGestaoExistente } = await supabaseAdmin
      .from('boletos_gestao')
      .select('id')
      .eq('boleto_caixa_id', boletoCaixa.id)
      .maybeSingle();
    
    if (boletoGestaoExistente) {
      console.log(`ℹ️ Boleto já existe em boletos_gestao (id: ${boletoGestaoExistente.id})`);
      return boletoGestaoExistente;
    }

    // Buscar dados do fechamento para obter clinica_id
    const { data: fechamentoCompleto, error: fechamentoError } = await supabaseAdmin
      .from('fechamentos')
      .select('clinica_id, empresa_id')
      .eq('id', fechamento.id)
      .single();
    
    if (fechamentoError || !fechamentoCompleto) {
      console.warn(`⚠️ Não foi possível obter dados do fechamento ${fechamento.id} para criar em boletos_gestao`);
      return null;
    }

    // Determinar status baseado na situação do boleto
    let status = 'pendente';
    const situacaoUpper = (boletoCaixa.situacao || '').toUpperCase();
    if (situacaoUpper === 'PAGO' || 
        situacaoUpper === 'LIQUIDADO' || 
        situacaoUpper.includes('PAGO') || 
        situacaoUpper === 'TITULO JA PAGO NO DIA') {
      status = 'pago';
    } else if (situacaoUpper === 'CANCELADO') {
      status = 'cancelado';
    } else {
      // Verificar se está vencido
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = boletoCaixa.data_vencimento ? new Date(boletoCaixa.data_vencimento) : null;
      if (vencimento) {
        vencimento.setHours(0, 0, 0, 0);
        if (vencimento < hoje && status === 'pendente') {
          status = 'vencido';
        }
      }
    }

    // Criar registro em boletos_gestao
    const { data: boletoGestaoCriado, error: gestaoError } = await supabaseAdmin
      .from('boletos_gestao')
      .insert([{
        fechamento_id: fechamento.id,
        paciente_id: boletoCaixa.paciente_id,
        clinica_id: fechamentoCompleto.clinica_id,
        empresa_id: fechamentoCompleto.empresa_id,
        numero_parcela: parcelaNumero,
        valor: parseFloat(boletoCaixa.valor) || 0,
        data_vencimento: boletoCaixa.data_vencimento,
        status: status,
        boleto_gerado: true,
        data_geracao_boleto: boletoCaixa.sincronizado_em || boletoCaixa.created_at || new Date().toISOString(),
        gerar_boleto: false,
        dias_antes_vencimento: 20,
        boleto_caixa_id: boletoCaixa.id,
        nosso_numero: boletoCaixa.nosso_numero,
        numero_documento: numeroDocumento || boletoCaixa.numero_documento,
        linha_digitavel: boletoCaixa.linha_digitavel,
        codigo_barras: boletoCaixa.codigo_barras,
        url_boleto: urlBoletoPublica || boletoCaixa.url,
        valor_pago: boletoCaixa.valor_pago || null,
        data_pagamento: boletoCaixa.data_hora_pagamento 
          ? boletoCaixa.data_hora_pagamento.split(' ')[0] // Extrair apenas a data (YYYY-MM-DD)
          : null
      }])
      .select()
      .single();
    
    if (gestaoError) {
      console.error(`⚠️ Erro ao criar em boletos_gestao:`, gestaoError);
      return null;
    }
    
    console.log(`✅ Boleto também criado em boletos_gestao (id: ${boletoGestaoCriado.id})`);
    return boletoGestaoCriado;
  } catch (error) {
    console.error(`❌ Erro ao criar em boletos_gestao:`, error);
    return null;
  }
}

/**
 * Criar boletos na Caixa para um fechamento
 * @param {Object} fechamento - Dados do fechamento criado
 * @param {Object} paciente - Dados do paciente
 * @param {String} idBeneficiario - ID do beneficiário na Caixa
 * @param {String} cnpjBeneficiario - CNPJ da empresa beneficiária (opcional)
 * @returns {Array} Array de boletos criados
 */
async function criarBoletosCaixa(fechamento, paciente, idBeneficiario, cnpjBeneficiario = null) {
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
    // IMPORTANTE: Conforme Swagger, o parâmetro na URL deve ser "integer", não string com barra
    // Portanto, sempre extrair apenas o código numérico para usar na URL
    let idBeneficiarioNormalizado;
    
    if (idBeneficiario.includes('/')) {
      // Extrair apenas o código numérico após a barra
      idBeneficiarioNormalizado = idBeneficiario.split('/')[1].trim();
      console.log(`📋 Extraindo código do beneficiário: ${idBeneficiario} -> ${idBeneficiarioNormalizado}`);
    } else {
      // Já está no formato numérico
      idBeneficiarioNormalizado = idBeneficiario.trim();
    }

    // Preparar dados do pagador
    const dadosPagador = {
      pagador_cpf: paciente.cpf.replace(/\D/g, ''), // Apenas números
      pagador_nome: paciente.nome,
      pagador_cidade: paciente.cidade || '',
      pagador_uf: paciente.estado || '',
      pagador_cep: paciente.cep ? paciente.cep.replace(/\D/g, '') : '', // CEP apenas números
      pagador_logradouro: paciente.endereco || '', // Rua/endereço
      pagador_numero: paciente.numero || '',
      pagador_bairro: paciente.bairro || '',
      pagador_complemento: '' // Complemento não temos ainda
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
      
      let sucessos = 0;
      let erros = 0;
      
      for (let i = 0; i < fechamento.numero_parcelas; i++) {
        try {
          console.log(`📝 [${i + 1}/${fechamento.numero_parcelas}] Criando boleto...`);
          
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
            cnpj_beneficiario: cnpjBeneficiario, // CNPJ da empresa beneficiária conforme manual
            ...dadosPagador
          });

          // Log detalhado para debug
          console.log(`📊 [${i + 1}/${fechamento.numero_parcelas}] Boleto criado na API Caixa:`);
          console.log(`   - nosso_numero: ${resultadoBoleto.nosso_numero}`);
          console.log(`   - nosso_numero (tipo): ${typeof resultadoBoleto.nosso_numero}`);
          console.log(`   - nosso_numero (valor exato):`, resultadoBoleto.nosso_numero);
          console.log(`   - nosso_numero (string): "${String(resultadoBoleto.nosso_numero)}"`);
          console.log(`   - numero_documento: ${numeroDocumento}`);
          console.log(`   - valor: ${fechamento.valor_parcela}`);

          // Normalizar URL do boleto: substituir IP interno pela URL pública
          let urlBoletoPublica = resultadoBoleto.url;
          if (urlBoletoPublica && urlBoletoPublica.includes('10.116.82.66')) {
            const urlPath = urlBoletoPublica.replace(/^https?:\/\/[^\/]+/, '');
            urlBoletoPublica = `https://boletoonline.caixa.gov.br${urlPath}`;
            console.log(`🔄 URL normalizada: ${resultadoBoleto.url} -> ${urlBoletoPublica}`);
          }

          // IMPORTANTE: Verificar APENAS por numero_documento (único por parcela)
          // Não verificar por nosso_numero porque a API da Caixa pode retornar o mesmo
          // nosso_numero para boletos diferentes (problema conhecido da API Sandbox)
          const { data: boletoExistente, error: erroPorDoc } = await supabaseAdmin
            .from('boletos_caixa')
            .select('*')
            .eq('numero_documento', numeroDocumento)
            .eq('fechamento_id', fechamento.id) // Garantir que é do mesmo fechamento
            .maybeSingle();

          if (boletoExistente && !erroPorDoc) {
            console.log(`⚠️ [${i + 1}/${fechamento.numero_parcelas}] Boleto já existe no banco por numero_documento: ${numeroDocumento} (id: ${boletoExistente.id}, nosso_numero: ${boletoExistente.nosso_numero})`);
            // Garantir que também existe em boletos_gestao
            await criarBoletoGestao(boletoExistente, fechamento, i + 1, urlBoletoPublica, numeroDocumento);
            // Adicionar ao array de retorno mesmo que já exista
            boletosCriados.push(boletoExistente);
            sucessos++;
            console.log(`✅ [${i + 1}/${fechamento.numero_parcelas}] Boleto existente adicionado ao retorno (id: ${boletoExistente.id})`);
            continue;
          }
          
          // Se não existe por numero_documento, tentar salvar mesmo que o nosso_numero possa ser duplicado
          // (a API da Caixa Sandbox às vezes retorna nosso_numero duplicados)

          // Salvar boleto no banco
          console.log(`💾 [${i + 1}/${fechamento.numero_parcelas}] Salvando boleto no banco:`);
          console.log(`   - nosso_numero a ser salvo: ${resultadoBoleto.nosso_numero}`);
          console.log(`   - nosso_numero (tipo): ${typeof resultadoBoleto.nosso_numero}`);
          console.log(`   - nosso_numero (valor exato):`, resultadoBoleto.nosso_numero);
          console.log(`   - nosso_numero (string): "${String(resultadoBoleto.nosso_numero)}"`);
          
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
              url: urlBoletoPublica,
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
            // Se for erro de duplicata, verificar se o boleto já existe e usar ele
            if (boletoError.code === '23505' || boletoError.message?.includes('duplicate key')) {
              console.warn(`⚠️ [${i + 1}/${fechamento.numero_parcelas}] Boleto duplicado detectado (duplicate key). Buscando boleto existente...`);
              
              // IMPORTANTE: Verificar APENAS por numero_documento (único por parcela)
              // NÃO buscar por nosso_numero porque a API pode retornar duplicados
              const { data: boletoPorDoc } = await supabaseAdmin
                .from('boletos_caixa')
                .select('*')
                .eq('numero_documento', numeroDocumento)
                .eq('fechamento_id', fechamento.id)
                .maybeSingle();
              
              if (boletoPorDoc) {
                // Boleto existe pelo numero_documento correto - usar ele
                console.log(`✅ [${i + 1}/${fechamento.numero_parcelas}] Boleto encontrado por numero_documento: ${numeroDocumento} (id: ${boletoPorDoc.id})`);
                // Garantir que também existe em boletos_gestao
                await criarBoletoGestao(boletoPorDoc, fechamento, i + 1, urlBoletoPublica, numeroDocumento);
                boletosCriados.push(boletoPorDoc);
                sucessos++;
                continue;
              } else {
                // Boleto NÃO existe pelo numero_documento, mas nosso_numero está duplicado
                // Isso é um problema da API da Caixa Sandbox retornando nosso_numero duplicados
                // Solução: Criar o boleto SEM nosso_numero ou com um valor alternativo
                console.error(`🔴 [${i + 1}/${fechamento.numero_parcelas}] PROBLEMA DA API CAIXA: nosso_numero ${resultadoBoleto.nosso_numero} duplicado!`);
                console.error(`   Tentando salvar boleto com numero_documento: ${numeroDocumento}`);
                console.error(`   Criando boleto SEM nosso_numero para evitar constraint...`);
                
                // Tentar criar o boleto sem o nosso_numero (ou com NULL)
                // Usar erro_criacao para armazenar informação sobre nosso_numero duplicado
                const { data: boletoSemNossoNumero, error: erroSemNossoNumero } = await supabaseAdmin
                  .from('boletos_caixa')
                  .insert([{
                    paciente_id: paciente.id,
                    fechamento_id: fechamento.id,
                    id_beneficiario: idBeneficiarioNormalizado,
                    nosso_numero: null, // NULL para evitar constraint
                    numero_documento: numeroDocumento,
                    codigo_barras: resultadoBoleto.codigo_barras,
                    linha_digitavel: resultadoBoleto.linha_digitavel,
                    url: urlBoletoPublica,
                    qrcode: resultadoBoleto.qrcode,
                    url_qrcode: resultadoBoleto.url_qrcode,
                    valor: parseFloat(fechamento.valor_parcela),
                    data_vencimento: dataVencimento.toISOString().split('T')[0],
                    data_emissao: new Date().toISOString().split('T')[0],
                    situacao: 'EM ABERTO',
                    status: 'pendente',
                    empresa_id: fechamento.empresa_id,
                    parcela_numero: i + 1,
                    sincronizado_em: new Date().toISOString(),
                    erro_criacao: `NOSSO_NUMERO_DUPLICADO_DA_API: ${resultadoBoleto.nosso_numero} (boleto válido criado na API)`
                  }])
                  .select()
                  .single();
                
                if (boletoSemNossoNumero && !erroSemNossoNumero) {
                  console.log(`✅ [${i + 1}/${fechamento.numero_parcelas}] Boleto criado SEM nosso_numero (id: ${boletoSemNossoNumero.id}, numero_documento: ${numeroDocumento})`);
                  // Criar também em boletos_gestao
                  await criarBoletoGestao(boletoSemNossoNumero, fechamento, i + 1, urlBoletoPublica, numeroDocumento);
                  boletosCriados.push(boletoSemNossoNumero);
                  sucessos++;
                  continue;
                } else {
                  console.error(`❌ [${i + 1}/${fechamento.numero_parcelas}] Erro ao criar boleto sem nosso_numero:`, erroSemNossoNumero);
                  erros++;
                  continue;
                }
              }
            }
            
            console.error(`❌ [${i + 1}/${fechamento.numero_parcelas}] Erro ao salvar boleto:`, boletoError);
            // Não lançar erro, apenas continuar para não parar o processo
            erros++;
            continue;
          }

          if (boletoSalvo) {
            console.log(`✅ [${i + 1}/${fechamento.numero_parcelas}] Boleto salvo no banco:`);
            console.log(`   - nosso_numero salvo: ${boletoSalvo.nosso_numero}`);
            console.log(`   - nosso_numero salvo (tipo): ${typeof boletoSalvo.nosso_numero}`);
            console.log(`   - nosso_numero salvo (valor exato):`, boletoSalvo.nosso_numero);
            console.log(`   - nosso_numero salvo (string): "${String(boletoSalvo.nosso_numero)}"`);
            console.log(`   - Comparação: API retornou "${resultadoBoleto.nosso_numero}" vs Banco salvou "${boletoSalvo.nosso_numero}"`);
            console.log(`   - São iguais? ${String(resultadoBoleto.nosso_numero) === String(boletoSalvo.nosso_numero)}`);
            console.log(`   - ID do boleto: ${boletoSalvo.id}`);
            
            // Criar também em boletos_gestao
            await criarBoletoGestao(boletoSalvo, fechamento, i + 1, urlBoletoPublica, numeroDocumento);
            
            boletosCriados.push(boletoSalvo);
            sucessos++;
          } else {
            console.warn(`⚠️ [${i + 1}/${fechamento.numero_parcelas}] Boleto criado na API mas não foi retornado pelo insert. Tentando buscar...`);
            
            // Tentar buscar o boleto que acabou de ser criado
            const { data: boletoBuscado } = await supabaseAdmin
              .from('boletos_caixa')
              .select('*')
              .eq('numero_documento', numeroDocumento)
              .eq('fechamento_id', fechamento.id)
              .maybeSingle();
            
            if (boletoBuscado) {
              console.log(`✅ [${i + 1}/${fechamento.numero_parcelas}] Boleto encontrado após insert (id: ${boletoBuscado.id})`);
              // Criar também em boletos_gestao
              await criarBoletoGestao(boletoBuscado, fechamento, i + 1, urlBoletoPublica, numeroDocumento);
              boletosCriados.push(boletoBuscado);
              sucessos++;
            } else {
              console.error(`❌ [${i + 1}/${fechamento.numero_parcelas}] Boleto não encontrado após insert. Possível problema na inserção.`);
              erros++;
            }
          }
          
          // Delay entre criações para respeitar rate limit da API (5 req/segundo)
          // Aumentar delay para evitar problemas de concorrência ao salvar no banco
          if (i < fechamento.numero_parcelas - 1) {
            await new Promise(resolve => setTimeout(resolve, 800)); // 800ms entre requisições
          }
        } catch (error) {
          erros++;
          console.error(`❌ Erro ao criar boleto ${i + 1}/${fechamento.numero_parcelas}:`, error.response?.data || error.message);
          
          // Salvar erro no banco para debug
          try {
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
          } catch (erroInsercao) {
            console.error(`❌ Erro ao salvar registro de erro do boleto ${i + 1}:`, erroInsercao);
          }
          
          // Continuar criando outros boletos mesmo se um falhar
          // Adicionar delay mesmo em caso de erro para não sobrecarregar a API
          if (i < fechamento.numero_parcelas - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      console.log(`📊 Resumo final:`);
      console.log(`   - Total solicitado: ${fechamento.numero_parcelas}`);
      console.log(`   - Total criado/salvo: ${boletosCriados.length}`);
      console.log(`   - Sucessos: ${sucessos}`);
      console.log(`   - Erros: ${erros}`);
      console.log(`   - Boletos no array de retorno: ${boletosCriados.length}`);
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
          cnpj_beneficiario: cnpjBeneficiario, // CNPJ da empresa beneficiária conforme manual
          ...dadosPagador
        });

        // Normalizar URL do boleto: substituir IP interno pela URL pública
        let urlBoletoPublica = resultadoBoleto.url;
        if (urlBoletoPublica && urlBoletoPublica.includes('10.116.82.66')) {
          const urlPath = urlBoletoPublica.replace(/^https?:\/\/[^\/]+/, '');
          urlBoletoPublica = `https://boletoonline.caixa.gov.br${urlPath}`;
          console.log(`🔄 URL normalizada: ${resultadoBoleto.url} -> ${urlBoletoPublica}`);
        }

        // Log detalhado para boleto único
        console.log(`📊 Boleto único criado na API Caixa:`);
        console.log(`   - nosso_numero: ${resultadoBoleto.nosso_numero}`);
        console.log(`   - nosso_numero (tipo): ${typeof resultadoBoleto.nosso_numero}`);
        console.log(`   - nosso_numero (valor exato):`, resultadoBoleto.nosso_numero);
        console.log(`   - nosso_numero (string): "${String(resultadoBoleto.nosso_numero)}"`);

        // Salvar boleto no banco
        console.log(`💾 Salvando boleto único no banco:`);
        console.log(`   - nosso_numero a ser salvo: ${resultadoBoleto.nosso_numero}`);
        console.log(`   - nosso_numero (tipo): ${typeof resultadoBoleto.nosso_numero}`);
        console.log(`   - nosso_numero (valor exato):`, resultadoBoleto.nosso_numero);
        
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
            url: urlBoletoPublica, // Usar URL normalizada (pública)
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

        if (boletoSalvo) {
          console.log(`✅ Boleto único salvo no banco:`);
          console.log(`   - nosso_numero salvo: ${boletoSalvo.nosso_numero}`);
          console.log(`   - nosso_numero salvo (tipo): ${typeof boletoSalvo.nosso_numero}`);
          console.log(`   - nosso_numero salvo (valor exato):`, boletoSalvo.nosso_numero);
          console.log(`   - nosso_numero salvo (string): "${String(boletoSalvo.nosso_numero)}"`);
          console.log(`   - Comparação: API retornou "${resultadoBoleto.nosso_numero}" vs Banco salvou "${boletoSalvo.nosso_numero}"`);
          console.log(`   - São iguais? ${String(resultadoBoleto.nosso_numero) === String(boletoSalvo.nosso_numero)}`);
          console.log(`   - ID do boleto: ${boletoSalvo.id}`);
          
          // Criar também em boletos_gestao
          await criarBoletoGestao(boletoSalvo, fechamento, 1, urlBoletoPublica, numeroDocumento);
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

