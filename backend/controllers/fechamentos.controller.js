const { supabase, supabaseAdmin } = require('../config/database');
const { STORAGE_BUCKET_CONTRATOS } = require('../config/constants');
const { uploadToSupabase } = require('../middleware/upload');
const bcrypt = require('bcrypt');
const transporter = require('../config/email');
const { criarMovimentacaoFechamentoCriado } = require('./movimentacoes.controller');
const { criarBoletosCaixa } = require('../utils/caixa-boletos.helper');

// GET /api/fechamentos - Listar fechamentos
const getAllFechamentos = async (req, res) => {
  try {
    // Query simples - o mapeamento será feito no frontend
    const selectQuery = `
      *,
      pacientes(nome, telefone, cpf, empreendimento_id),
      clinicas(nome)
    `;

    let query = supabaseAdmin
      .from('fechamentos')
      .select(selectQuery)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Se for admin, parceiro ou consultor interno, filtrar apenas fechamentos da empresa
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os fechamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(f => f.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(f => f.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(f => f.consultor_interno_id).filter(Boolean))];
    
    const allConsultoresIds = [...new Set([...consultoresIds, ...sdrIds, ...consultorInternoIds])];
    
    let consultoresNomes = {};
    if (allConsultoresIds.length > 0) {
      const { data: consultoresData } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', allConsultoresIds);
      
      consultoresNomes = consultoresData?.reduce((acc, c) => {
        acc[c.id] = c.nome;
        return acc;
      }, {}) || {};
    }

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(fechamento => {
      // NÃO gerar URL aqui - será gerada sob demanda quando o usuário clicar para baixar
      return {
        ...fechamento,
        paciente_nome: fechamento.pacientes?.nome,
        paciente_telefone: fechamento.pacientes?.telefone,
        paciente_cpf: fechamento.pacientes?.cpf,
        paciente_empreendimento_id: fechamento.pacientes?.empreendimento_id,
        consultor_nome: consultoresNomes[fechamento.consultor_id] || null,
        sdr_nome: consultoresNomes[fechamento.sdr_id] || null,
        consultor_interno_nome: consultoresNomes[fechamento.consultor_interno_id] || null,
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
    // Query simples - o mapeamento será feito no frontend
    const selectQuery = `
      *,
      pacientes(nome, telefone, cpf, empreendimento_id),
      clinicas(nome)
    `;

    let query = supabaseAdmin
      .from('fechamentos')
      .select(selectQuery)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Se for admin, parceiro ou consultor interno, filtrar apenas fechamentos da empresa
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os fechamentos
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(f => f.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(f => f.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(f => f.consultor_interno_id).filter(Boolean))];
    
    const allConsultoresIds = [...new Set([...consultoresIds, ...sdrIds, ...consultorInternoIds])];
    
    let consultoresNomes = {};
    if (allConsultoresIds.length > 0) {
      const { data: consultoresData } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', allConsultoresIds);
      
      consultoresNomes = consultoresData?.reduce((acc, c) => {
        acc[c.id] = c.nome;
        return acc;
      }, {}) || {};
    }

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(fechamento => {
      // NÃO gerar URL aqui - será gerada sob demanda quando o usuário clicar para baixar
      return {
        ...fechamento,
        paciente_nome: fechamento.pacientes?.nome,
        paciente_telefone: fechamento.pacientes?.telefone,
        paciente_cpf: fechamento.pacientes?.cpf,
        paciente_empreendimento_id: fechamento.pacientes?.empreendimento_id,
        consultor_nome: consultoresNomes[fechamento.consultor_id] || null,
        sdr_nome: consultoresNomes[fechamento.sdr_id] || null,
        consultor_interno_nome: consultoresNomes[fechamento.consultor_interno_id] || null,
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
      empreendimento_id,
      valor_parcela,
      numero_parcelas,
      vencimento,
      antecipacao_meses,
      // Novos campos administrativos
      data_operacao,
      valor_entregue,
      tipo_operacao,
      // Campos de entrada
      entrada_total,
      entrada_paga
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
    const empreendimentoId = empreendimento_id && empreendimento_id !== '' ? 
      (typeof empreendimento_id === 'number' ? empreendimento_id : parseInt(empreendimento_id)) : null;

    // Validar que clínica é obrigatória apenas para não incorporadora
    if (!clinicaId && req.user.empresa_id !== 5) {
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
    
    // Processar vencimento: pode vir como número (dia do mês) ou data completa
    let vencimentoData = null;
    if (vencimento) {
      // Se for um número entre 1-31 (dia do mês antigo), converter para data completa
      const vencimentoNum = parseInt(vencimento);
      if (!isNaN(vencimentoNum) && vencimentoNum >= 1 && vencimentoNum <= 31 && vencimento.toString().length <= 2) {
        // É um número (dia do mês) - converter para data completa
        const dataBase = data_fechamento ? new Date(data_fechamento) : new Date();
        const diaMes = vencimentoNum;
        const mesAtual = dataBase.getMonth();
        const anoAtual = dataBase.getFullYear();
        
        // Criar data usando o dia informado do próximo mês (ou mesmo mês se ainda não passou)
        const dataVencimento = new Date(anoAtual, mesAtual, diaMes);
        if (dataVencimento < dataBase) {
          // Se já passou, usar próximo mês
          dataVencimento.setMonth(mesAtual + 1);
        }
        
        // Garantir que a data é válida (ajustar se dia não existe no mês)
        const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
        if (diaMes > ultimoDiaMes) {
          dataVencimento.setDate(ultimoDiaMes);
        }
        
        vencimentoData = dataVencimento.toISOString().split('T')[0]; // YYYY-MM-DD
        console.log(`⚠️ [LEGADO] Vencimento convertido de número (${vencimentoNum}) para data: ${vencimentoData}`);
      } else {
        // Já é uma data completa (YYYY-MM-DD) ou formato de data válido
        try {
          const dataTeste = new Date(vencimento);
          if (!isNaN(dataTeste.getTime())) {
            vencimentoData = dataTeste.toISOString().split('T')[0]; // Garantir formato YYYY-MM-DD
          } else {
            vencimentoData = vencimento; // Tentar usar como está
          }
        } catch (e) {
          vencimentoData = vencimento; // Tentar usar como está
        }
      }
    }
    
    const antecipacaoMeses = antecipacao_meses ? parseInt(antecipacao_meses) : null;
    
    // Validar e processar novos campos administrativos
    const dataOperacao = data_operacao || null;
    const valorEntregueVal = valor_entregue ? parseFloat(valor_entregue) : null;
    const tipoOperacaoVal = tipo_operacao || null;
    // Processar campos de entrada
    const entradaTotalVal = entrada_total ? parseFloat(entrada_total) : null;
    const entradaPagaVal = entrada_paga ? parseFloat(entrada_paga) : null;

    // Dados do contrato (se houver arquivo)
    let contratoArquivo = null;
    let contratoNomeOriginal = null;
    let contratoTamanho = null;
    
    // Dados do print de confirmação
    let printConfirmacaoArquivo = null;
    let printConfirmacaoNome = null;
    let printConfirmacaoTamanho = null;
    
    // Se houver arquivo de contrato, fazer upload para Supabase Storage
    let contratoHashSHA1 = null;
    let contratoHashCriadoEm = null;
    
    if (req.files?.contrato && req.files.contrato[0]) {
      try {
        // Gerar hash SHA1 do contrato original ANTES do upload
        const crypto = require('crypto');
        const contratoBuffer = req.files.contrato[0].buffer;
        contratoHashSHA1 = crypto.createHash('sha1')
          .update(contratoBuffer)
          .digest('hex')
          .toUpperCase();
        contratoHashCriadoEm = new Date().toISOString();
        
        console.log('🔐 [HASH INICIAL] Hash SHA1 do contrato gerado:', contratoHashSHA1);
        
        const uploadResult = await uploadToSupabase(req.files.contrato[0], STORAGE_BUCKET_CONTRATOS, 'fechamentos', 'contrato');
        contratoArquivo = uploadResult.path; // Usar o caminho completo em vez de apenas o nome
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
        const uploadResult = await uploadToSupabase(req.files.print_confirmacao[0], STORAGE_BUCKET_CONTRATOS, 'fechamentos', 'print_confirmacao');
        printConfirmacaoArquivo = uploadResult.path; // Usar o caminho completo em vez de apenas o nome
        printConfirmacaoNome = uploadResult.originalName;
        printConfirmacaoTamanho = uploadResult.size;
      } catch (uploadError) {
        console.error('Erro detalhado no upload do print de confirmação:', uploadError);
        // Não bloquear o fechamento se houver erro no upload do print
        console.warn('Print de confirmação não foi salvo devido a erro no upload');
      }
    }
    
    // Buscar dados do agendamento relacionado para copiar os IDs
    let dadosAgendamento = null;
    if (paciente_id) {
      const { data: agendamentoData } = await supabaseAdmin
        .from('agendamentos')
        .select('consultor_id, sdr_id, consultor_interno_id')
        .eq('paciente_id', paciente_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      dadosAgendamento = agendamentoData;
    }
    
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .insert([{
        paciente_id: parseInt(paciente_id),
        consultor_id: dadosAgendamento?.consultor_id || consultorId, // freelancer que indicou
        sdr_id: dadosAgendamento?.sdr_id, // SDR que trabalhou o lead
        consultor_interno_id: dadosAgendamento?.consultor_interno_id || consultorId, // consultor interno que fechou
        clinica_id: clinicaId,
        // Para incorporadora (empresa_id = 5), salvar o empreendimento_id
        empreendimento_id: req.user.empresa_id === 5 ? empreendimentoId : null,
        valor_fechado: valorFechado,
        data_fechamento,
        tipo_tratamento: tipo_tratamento || null,
        observacoes: observacoes || null,
        contrato_arquivo: contratoArquivo,
        contrato_nome_original: contratoNomeOriginal,
        contrato_tamanho: contratoTamanho,
        contrato_hash_sha1: contratoHashSHA1,
        contrato_hash_criado_em: contratoHashCriadoEm,
        valor_parcela: valorParcela,
        numero_parcelas: numeroParcelas,
        vencimento: vencimentoData,
        antecipacao_meses: antecipacaoMeses,
        // Novos campos administrativos
        data_operacao: dataOperacao,
        valor_entregue: valorEntregueVal,
        tipo_operacao: tipoOperacaoVal,
        // Campos de entrada
        entrada_total: entradaTotalVal,
        entrada_paga: entradaPagaVal,
        print_confirmacao_arquivo: printConfirmacaoArquivo,
        print_confirmacao_nome: printConfirmacaoNome,
        print_confirmacao_tamanho: printConfirmacaoTamanho,
        aprovado: req.user.empresa_id === 5 ? 'aprovado' : 'pendente', // Incorporadora sempre aprovado, outras empresas pendente
        empresa_id: req.user.empresa_id // Adicionar empresa_id do usuário que está criando
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
      const updateData = { status: 'fechado' };
      
      // Para incorporadora, atualizar também o empreendimento_id do paciente
      if (req.user.empresa_id === 5 && empreendimentoId) {
        updateData.empreendimento_id = empreendimentoId;
        console.log('✅ Atualizando empreendimento_id na tabela pacientes:', empreendimentoId);
      }
      
      await supabaseAdmin
        .from('pacientes')
        .update(updateData)
        .eq('id', paciente_id);
    }

    // Criar agendamento automaticamente com status "fechado" apenas se não for fechamento automático
    // (fechamentos automáticos já têm agendamento criado no fluxo agendamentos → fechamentos)
    if (paciente_id && !isAutomaticFechamento) {
      try {
        const agendamentoData = {
          paciente_id: parseInt(paciente_id),
          consultor_id: consultorId,
          data_agendamento: data_fechamento, // Usar a mesma data do fechamento
          horario: '00:00', // Horário padrão
          status: 'fechado', // Status automático "fechado"
          observacoes: 'Agendamento criado automaticamente a partir do fechamento',
          empresa_id: req.user.empresa_id
        };
        
        // Só incluir clinica_id se não for incorporadora
        if (req.user.empresa_id !== 5) {
          agendamentoData.clinica_id = clinicaId;
        }
        
        await supabaseAdmin
          .from('agendamentos')
          .insert([agendamentoData]);
      } catch (agendamentoError) {
        console.error('Erro ao criar agendamento automático:', agendamentoError);
        // Não bloquear o fechamento se houver erro no agendamento
      }
    }

    // Registrar movimentação de fechamento criado
    try {
      const fechamentoId = data[0].id;
      await criarMovimentacaoFechamentoCriado(fechamentoId, {
        consultor_id: dadosAgendamento?.consultor_id || consultorId,
        sdr_id: dadosAgendamento?.sdr_id,
        consultor_interno_id: dadosAgendamento?.consultor_interno_id || consultorId,
        executado_por: req.user,
        dados_novos: {
          valor_fechado: valorFechado,
          data_fechamento,
          tipo_tratamento: tipo_tratamento || null
        }
      });
      console.log('✅ Movimentação de fechamento criado registrada');
    } catch (movimentacaoError) {
      console.error('⚠️ Erro ao registrar movimentação de fechamento:', movimentacaoError);
      // Não falhar a operação principal se houver erro na movimentação
    }

    // Definir consultorInternoIdFinal para uso na notificação
    const consultorInternoIdFinal = dadosAgendamento?.consultor_interno_id || consultorId;

    // Criar notificação para incorporadora sobre novo fechamento via Supabase Realtime
    if (consultorInternoIdFinal && req.user.empresa_id === 5) {
      console.log('📢 [NOTIFICAÇÃO] Criando notificação de novo fechamento:', {
        fechamentoId: data[0].id,
        paciente_id: paciente_id,
        consultorInternoId: consultorInternoIdFinal,
        empresa_id: req.user.empresa_id,
        valor_fechado: valorFechado,
        data_fechamento: data_fechamento,
        timestamp: new Date().toISOString()
      });
      
      // Buscar dados do corretor (consultor interno)
      const { data: corretorData } = await supabaseAdmin
        .from('consultores')
        .select('nome, foto_url, musica_url')
        .eq('id', consultorInternoIdFinal)
        .single();

      console.log('👤 [NOTIFICAÇÃO] Dados do corretor encontrados:', {
        consultorInternoId: consultorInternoIdFinal,
        nome: corretorData?.nome || 'N/A',
        temFoto: !!corretorData?.foto_url,
        temMusica: !!corretorData?.musica_url
      });

      // Buscar dados do paciente
      const { data: pacienteData } = await supabaseAdmin
        .from('pacientes')
        .select('nome, telefone')
        .eq('id', paciente_id)
        .single();

      console.log('👤 [NOTIFICAÇÃO] Dados do paciente encontrados:', {
        paciente_id: paciente_id,
        nome: pacienteData?.nome || 'N/A',
        telefone: pacienteData?.telefone || 'N/A'
      });

      // Inserir notificação na tabela (Supabase Realtime vai propagar)
      try {
        const { data: notificacaoData, error: notificacaoError } = await supabaseAdmin
          .from('notificacoes_fechamentos')
          .insert([{
            fechamento_id: data[0].id,
            paciente_nome: pacienteData?.nome || 'Cliente',
            paciente_telefone: pacienteData?.telefone || '',
            valor_fechado: valorFechado,
            data_fechamento: data_fechamento,
            consultor_interno_id: consultorInternoIdFinal,
            corretor_nome: corretorData?.nome || 'Corretor',
            corretor_foto: corretorData?.foto_url || null,
            corretor_musica: corretorData?.musica_url || null,
            empresa_id: 5,
            lida: false
          }])
          .select()
          .single();

        if (notificacaoError) {
          console.error('❌ [NOTIFICAÇÃO] Erro ao criar notificação de fechamento:', notificacaoError);
        } else {
          console.log('✅ [NOTIFICAÇÃO] Notificação de fechamento criada via Supabase Realtime:', {
            notificacaoId: notificacaoData.id,
            fechamentoId: data[0].id
          });
        }
      } catch (error) {
        console.error('❌ [NOTIFICAÇÃO] Erro ao inserir notificação no banco:', error);
      }
    } else {
      console.log('ℹ️ [NOTIFICAÇÃO] Notificação de fechamento não criada:', {
        temConsultorInternoId: !!consultorInternoIdFinal,
        empresaId: req.user.empresa_id,
        motivo: !consultorInternoIdFinal ? 'Sem consultorInternoIdFinal' : 
                req.user.empresa_id !== 5 ? 'Não é incorporadora' : 'Desconhecido'
      });
    }

    // ============================================
    // INTEGRAÇÃO COM API CAIXA - Criar boletos
    // ============================================
    // Criar boletos automaticamente para empresa_id 3 (após aprovação)
    // Para incorporadora (empresa_id 5), fechamentos já são criados como aprovados
    // Para outras empresas, fechamentos começam como pendentes e são aprovados depois
    if (req.user.empresa_id === 3 && data[0].aprovado === 'aprovado') {
      try {
        console.log('🏦 [CAIXA] Iniciando criação de boletos para empresa_id 3');
        
        // Buscar dados completos do paciente
        const { data: pacienteCompleto, error: pacienteError } = await supabaseAdmin
          .from('pacientes')
          .select('*')
          .eq('id', paciente_id)
          .single();

        if (pacienteError || !pacienteCompleto) {
          console.error('❌ [CAIXA] Erro ao buscar paciente:', pacienteError);
        } else {
          // Buscar CNPJ da empresa beneficiária (necessário para o payload conforme manual)
          const { data: empresaData, error: empresaError } = await supabaseAdmin
            .from('empresas')
            .select('cnpj')
            .eq('id', data[0].empresa_id)
            .single();

          // CNPJ correto da INVESTMONEY SECURITIZADORA DE CREDITOS S/A
          const CNPJ_CORRETO = '41267440000197';
          let cnpjParaUsar = null;

          if (empresaError || !empresaData || !empresaData.cnpj) {
            console.warn('⚠️ [CAIXA] Não foi possível buscar CNPJ da empresa. Usando CNPJ padrão da INVESTMONEY.');
            cnpjParaUsar = CNPJ_CORRETO;
          } else {
            // Normalizar CNPJ (remover formatação)
            const cnpjNormalizado = empresaData.cnpj.replace(/\D/g, '');
            
            // Validar se o CNPJ está correto (14 dígitos e corresponde ao da INVESTMONEY)
            if (cnpjNormalizado.length === 14 && cnpjNormalizado === CNPJ_CORRETO) {
              cnpjParaUsar = cnpjNormalizado;
              console.log(`✅ [CAIXA] CNPJ validado e correto: ${cnpjParaUsar}`);
            } else {
              console.warn(`⚠️ [CAIXA] CNPJ do banco (${cnpjNormalizado}) não corresponde ao CNPJ cadastrado na Caixa (${CNPJ_CORRETO}). Usando CNPJ correto.`);
              cnpjParaUsar = CNPJ_CORRETO;
            }
          }

          // Obter ID do beneficiário (configurável por empresa)
          const idBeneficiarioRaw = process.env.CAIXA_ID_BENEFICIARIO;
          
          if (!idBeneficiarioRaw) {
            console.warn('⚠️ [CAIXA] CAIXA_ID_BENEFICIARIO não configurado. Configure no .env');
          } else {
            // Normalizar ID do beneficiário (pode vir como "0374/1242669" ou apenas "1242669")
            // IMPORTANTE: Conforme Swagger, o parâmetro na URL deve ser "integer", não string com barra
            // Portanto, sempre extrair apenas o código numérico para usar na URL
            let idBeneficiario;
            
            if (idBeneficiarioRaw.includes('/')) {
              // Extrair apenas o código numérico após a barra
              idBeneficiario = idBeneficiarioRaw.split('/')[1].trim();
              console.log(`📋 [CAIXA] Extraindo código do beneficiário: ${idBeneficiarioRaw} -> ${idBeneficiario}`);
            } else {
              // Já está no formato numérico
              idBeneficiario = idBeneficiarioRaw.trim();
            }
            
            // Criar boletos na Caixa
            const boletosCriados = await criarBoletosCaixa(
              data[0],
              pacienteCompleto,
              idBeneficiario,
              cnpjParaUsar // Passar CNPJ validado/correto da empresa beneficiária
            );
            
            if (boletosCriados.length > 0) {
              console.log(`✅ [CAIXA] ${boletosCriados.length} boleto(s) criado(s) com sucesso`);
            } else {
              console.warn('⚠️ [CAIXA] Nenhum boleto foi criado');
            }
          }
        }
      } catch (caixaError) {
        console.error('❌ [CAIXA] Erro ao criar boletos:', caixaError);
        // Não bloquear o fechamento se houver erro na criação de boletos
        // Os erros são salvos na tabela boletos_caixa para debug
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
      tipo_operacao,
      // Campos de entrada
      entrada_total,
      entrada_paga
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
    
    // Processar vencimento: pode vir como número (dia do mês) ou data completa
    let vencimentoVal = null;
    if (vencimento) {
      // Se for um número entre 1-31 (dia do mês antigo), converter para data completa
      const vencimentoNum = parseInt(vencimento);
      if (!isNaN(vencimentoNum) && vencimentoNum >= 1 && vencimentoNum <= 31 && vencimento.toString().length <= 2) {
        // É um número (dia do mês) - converter para data completa
        const dataBase = data_fechamento ? new Date(data_fechamento) : new Date();
        const diaMes = vencimentoNum;
        const mesAtual = dataBase.getMonth();
        const anoAtual = dataBase.getFullYear();
        
        // Criar data usando o dia informado do próximo mês (ou mesmo mês se ainda não passou)
        const dataVencimento = new Date(anoAtual, mesAtual, diaMes);
        if (dataVencimento < dataBase) {
          // Se já passou, usar próximo mês
          dataVencimento.setMonth(mesAtual + 1);
        }
        
        // Garantir que a data é válida (ajustar se dia não existe no mês)
        const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
        if (diaMes > ultimoDiaMes) {
          dataVencimento.setDate(ultimoDiaMes);
        }
        
        vencimentoVal = dataVencimento.toISOString().split('T')[0]; // YYYY-MM-DD
        console.log(`⚠️ [LEGADO] Vencimento convertido de número (${vencimentoNum}) para data: ${vencimentoVal}`);
      } else {
        // Já é uma data completa (YYYY-MM-DD) ou formato de data válido
        try {
          const dataTeste = new Date(vencimento);
          if (!isNaN(dataTeste.getTime())) {
            vencimentoVal = dataTeste.toISOString().split('T')[0]; // Garantir formato YYYY-MM-DD
          } else {
            vencimentoVal = vencimento; // Tentar usar como está
          }
        } catch (e) {
          vencimentoVal = vencimento; // Tentar usar como está
        }
      }
    }
    
    const antecipacaoMesesVal = antecipacao_meses ? parseInt(antecipacao_meses) : null;
    
    // Processar campos administrativos
    const dataOperacao = data_operacao || null;
    const valorEntregueVal = valor_entregue ? parseFloat(valor_entregue) : null;
    const tipoOperacaoVal = tipo_operacao || null;
    // Processar campos de entrada
    const entradaTotalVal = entrada_total ? parseFloat(entrada_total) : null;
    const entradaPagaVal = entrada_paga ? parseFloat(entrada_paga) : null;
    
    // Upload de print de confirmação se fornecido
    let printConfirmacaoArquivo = null;
    let printConfirmacaoNome = null;
    let printConfirmacaoTamanho = null;
    
    if (req.files?.print_confirmacao && req.files.print_confirmacao[0]) {
      try {
        const uploadResult = await uploadToSupabase(req.files.print_confirmacao[0], STORAGE_BUCKET_CONTRATOS, 'fechamentos', 'print_confirmacao');
        printConfirmacaoArquivo = uploadResult.path; // Usar o caminho completo em vez de apenas o nome
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
      tipo_operacao: tipoOperacaoVal,
      // Campos de entrada
      entrada_total: entradaTotalVal,
      entrada_paga: entradaPagaVal
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

    console.log('🔍 [GET_CONTRATO_URL] Iniciando busca de contrato para fechamento:', id);

    // Buscar dados do fechamento
    const { data: fechamento, error } = await supabaseAdmin
      .from('fechamentos')
      .select('contrato_arquivo, contrato_nome_original')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ [GET_CONTRATO_URL] Erro ao buscar fechamento:', error);
      return res.status(404).json({ error: 'Fechamento não encontrado', details: error.message });
    }

    if (!fechamento) {
      console.warn('⚠️ [GET_CONTRATO_URL] Fechamento não encontrado:', id);
      return res.status(404).json({ error: 'Fechamento não encontrado!' });
    }

    if (!fechamento?.contrato_arquivo) {
      console.warn('⚠️ [GET_CONTRATO_URL] Fechamento não tem contrato_arquivo:', id);
      return res.status(404).json({ error: 'Contrato não encontrado no fechamento!' });
    }

    // Log para debug
    console.log('🔍 [GET_CONTRATO_URL] Buscando contrato:', {
      fechamento_id: id,
      contrato_arquivo: fechamento.contrato_arquivo,
      bucket: STORAGE_BUCKET_CONTRATOS
    });

    // Tentar primeiro com o caminho completo, depois apenas com o nome (compatibilidade com fechamentos antigos)
    let contratoPath = fechamento.contrato_arquivo;
    
    // Se o arquivo não tem pasta, adicionar a pasta fechamentos
    if (!contratoPath.includes('/')) {
      contratoPath = `fechamentos/${contratoPath}`;
    }

    console.log('🔍 [GET_CONTRATO_URL] Caminho do contrato:', contratoPath);

    // Gerar URL assinada com validade de 24 horas (86400 segundos)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .createSignedUrl(contratoPath, 86400);

    if (urlError) {
      console.error('❌ [GET_CONTRATO_URL] Erro ao gerar URL assinada:', urlError);
      console.error('❌ [GET_CONTRATO_URL] Detalhes do erro:', {
        message: urlError.message,
        statusCode: urlError.statusCode,
        error: urlError.error
      });
      return res.status(500).json({ 
        error: 'Erro ao gerar URL de download', 
        details: urlError.message 
      });
    }

    if (!urlData || !urlData.signedUrl) {
      console.error('❌ [GET_CONTRATO_URL] URL assinada não foi gerada corretamente');
      return res.status(500).json({ error: 'Erro ao gerar URL de download' });
    }

    console.log('✅ [GET_CONTRATO_URL] URL gerada com sucesso para fechamento:', id);

    // Retornar apenas a URL assinada
    res.json({ 
      url: urlData.signedUrl,
      nome: fechamento.contrato_nome_original || 'contrato.pdf',
      expiraEm: '24 horas'
    });
  } catch (error) {
    console.error('❌ [GET_CONTRATO_URL] Erro ao gerar URL do contrato:', error);
    console.error('❌ [GET_CONTRATO_URL] Stack trace:', error.stack);
    res.status(500).json({ 
      error: error.message || 'Erro ao gerar URL do contrato',
      details: error.stack 
    });
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

    // Tentar primeiro com o caminho completo, depois apenas com o nome (compatibilidade com fechamentos antigos)
    let contratoPath = fechamento.contrato_arquivo;
    
    // Se o arquivo não tem pasta, adicionar a pasta fechamentos
    if (!contratoPath.includes('/')) {
      contratoPath = `fechamentos/${contratoPath}`;
    }

    // Fazer download do arquivo do Supabase Storage
    const { data, error: downloadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .download(contratoPath);

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

    // Tentar primeiro com o caminho completo, depois apenas com o nome (compatibilidade com fechamentos antigos)
    let printPath = fechamento.print_confirmacao_arquivo;
    
    // Se o arquivo não tem pasta, adicionar a pasta fechamentos
    if (!printPath.includes('/')) {
      printPath = `fechamentos/${printPath}`;
    }

    // Gerar URL assinada com validade de 24 horas (86400 segundos)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_CONTRATOS)
      .createSignedUrl(printPath, 86400);

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
    
    // Primeiro, verificar se o fechamento existe (incluindo o hash do contrato)
    const { data: fechamento, error: fetchError } = await supabaseAdmin
      .from('fechamentos')
      .select('*, contrato_hash_sha1')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    console.log('🔐 [HASH] Fechamento tem hash existente?', fechamento.contrato_hash_sha1 ? 'SIM' : 'NÃO');
    
    // Verificar se já está aprovado (evitar criar boletos duplicados)
    const jaEstaAprovado = fechamento.aprovado === 'aprovado';
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .update({ aprovado: 'aprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('❌ Erro ao atualizar status aprovado:', error);
      return res.status(500).json({ error: 'Erro ao aprovar fechamento' });
    }
    
    // Atualizar status do paciente para "fechado" quando o fechamento for aprovado
    if (!jaEstaAprovado && fechamento.paciente_id) {
      try {
        const { error: pacienteError } = await supabaseAdmin
          .from('pacientes')
          .update({ status: 'fechado' })
          .eq('id', fechamento.paciente_id);
          
        if (pacienteError) {
          console.error('❌ Erro ao atualizar status do paciente:', pacienteError);
        } else {
          console.log('✅ Status do paciente atualizado para "fechado"');
        }
      } catch (err) {
        console.error('❌ Erro ao atualizar paciente:', err);
      }
    }
    
    // ============================================
    // BOLETOS - Importar para gestão manual
    // ============================================
    // Importar boletos para gestão manual (não gerar automaticamente)
    if (!jaEstaAprovado && fechamento.empresa_id === 3 && data && data[0]) {
      try {
        console.log('📋 [BOLETOS] Fechamento aprovado - Importando boletos para gestão manual');
        
        // Importar boletos para gestão manual
        const { data: boletosImportados, error: importError } = await supabaseAdmin
          .rpc('importar_boletos_fechamento', {
            p_fechamento_id: fechamento.id,
            p_usuario_id: req.user.id,
            p_gerar_automatico: false, // Não gerar automaticamente
            p_dias_antes: 20 // 20 dias antes do vencimento
          });
        
        if (importError) {
          console.error('❌ [BOLETOS] Erro ao importar boletos:', importError);
        } else {
          console.log(`✅ [BOLETOS] ${boletosImportados} boletos importados para gestão manual`);
        }
        
        // REMOVIDO: Geração automática de boletos na Caixa
        // Os boletos agora serão gerados manualmente ou por job agendado
      } catch (caixaError) {
        console.error('❌ [BOLETOS] Erro ao importar boletos para gestão manual:', caixaError);
        // Não bloquear a aprovação se houver erro na importação de boletos
      }
    }
    
    // ============================================
    // ASSINATURA DIGITAL AUTOMÁTICA
    // ============================================
    // Aplicar assinatura digital do admin automaticamente quando fechamento for aprovado
    if (!jaEstaAprovado && data && data[0]) {
      try {
        console.log('✍️ [ASSINATURA DIGITAL] Iniciando assinatura automática do fechamento aprovado');
        console.log('📋 [ASSINATURA DIGITAL] Dados do usuário:', {
          id: req.user.id,
          nome: req.user.nome,
          tipo: req.user.tipo,
          email: req.user.email
        });
        
        // Buscar assinatura ativa do admin
        const { data: assinaturaAdmin, error: assinaturaError } = await supabaseAdmin
          .from('assinaturas_admin')
          .select('*')
          .eq('usuario_id', req.user.id)
          .eq('ativa', true)
          .single();
        
        if (assinaturaError || !assinaturaAdmin) {
          console.warn('⚠️ [ASSINATURA DIGITAL] Admin não possui assinatura cadastrada. Pulando assinatura automática.');
          console.log('Erro ao buscar assinatura:', assinaturaError);
          console.log('ID do admin:', req.user.id);
        } else {
          console.log('✅ [ASSINATURA DIGITAL] Assinatura do admin encontrada:', {
            id: assinaturaAdmin.id,
            nome: assinaturaAdmin.nome_admin,
            documento: assinaturaAdmin.documento_admin
          });
          // Buscar dados do paciente
          const { data: pacienteCompleto, error: pacienteError } = await supabaseAdmin
            .from('pacientes')
            .select('*')
            .eq('id', fechamento.paciente_id)
            .single();
          
          if (pacienteError || !pacienteCompleto) {
            console.error('❌ [ASSINATURA DIGITAL] Erro ao buscar paciente:', pacienteError);
          } else {
            // Buscar dados da clínica (se houver)
            let dadosClinica = null;
            if (fechamento.clinica_id) {
              const { data: clinicaData } = await supabaseAdmin
                .from('clinicas')
                .select('nome, cnpj')
                .eq('id', fechamento.clinica_id)
                .single();
              
              dadosClinica = clinicaData || null;
            }
            
            // Buscar contrato do paciente
            const contratoUrl = pacienteCompleto.contrato_servico_url;
            
            if (!contratoUrl) {
              console.warn('⚠️ [ASSINATURA DIGITAL] Paciente não possui contrato. Pulando assinatura.');
            } else {
              // Verificar se o paciente já assinou o contrato (verificar no sistema de rastreabilidade)
              let contratoJaAssinadoPeloPaciente = false;
              const cpfPaciente = pacienteCompleto.cpf?.replace(/\D/g, '') || '';
              
              if (cpfPaciente) {
                // Verificar se há algum documento assinado por este paciente recentemente
                // (últimos 30 dias, para garantir que é relacionado a este contrato)
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 30);
                
                const { data: documentosAssinados } = await supabaseAdmin
                  .from('documentos_assinados')
                  .select('*')
                  .eq('documento', cpfPaciente)
                  .ilike('nome', '%Contrato%')
                  .gte('data_assinatura', dataLimite.toISOString())
                  .order('data_assinatura', { ascending: false })
                  .limit(1);
                
                if (documentosAssinados && documentosAssinados.length > 0) {
                  contratoJaAssinadoPeloPaciente = true;
                  console.log('✅ [ASSINATURA DIGITAL] Contrato já foi assinado pelo paciente');
                }
              }
              
              // Baixar PDF do contrato
              const contratoResponse = await fetch(contratoUrl);
              if (!contratoResponse.ok) {
                throw new Error('Erro ao baixar contrato');
              }
              
              const contratoBuffer = await contratoResponse.arrayBuffer();
              const contratoBytes = new Uint8Array(contratoBuffer);
              
              // Aplicar assinatura usando o serviço
              const assinaturaService = require('../services/assinatura-admin.service');
              
              // Se o paciente já assinou, passar um flag para preservar as assinaturas existentes
              const resultadoAssinatura = await assinaturaService.aplicarAssinaturaAdminAutomatica(
                contratoBytes,
                assinaturaAdmin.assinatura_base64,
                {
                  nome: assinaturaAdmin.nome_admin,
                  documento: assinaturaAdmin.documento_admin
                },
                {
                  nome: pacienteCompleto.nome,
                  cpf: pacienteCompleto.cpf?.replace(/\D/g, '') || ''
                },
                dadosClinica ? {
                  nome: dadosClinica.nome,
                  cnpj: dadosClinica.cnpj?.replace(/\D/g, '') || ''
                } : null,
                contratoJaAssinadoPeloPaciente ? fechamento.contrato_hash_sha1 : null, // Passar hash apenas se paciente já assinou
                contratoJaAssinadoPeloPaciente // Flag indicando que o PDF já foi assinado pelo paciente
              );
              
              // Upload do contrato assinado para Supabase Storage
              const documentsService = require('../services/documents.service');
              const { STORAGE_BUCKET_DOCUMENTOS } = require('../config/constants');
              
              const timestamp = Date.now();
              const fileName = `pacientes/${pacienteCompleto.id}/contrato_servico_assinado_${timestamp}.pdf`;
              
              const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from(STORAGE_BUCKET_DOCUMENTOS)
                .upload(fileName, Buffer.from(resultadoAssinatura.pdfAssinado), {
                  contentType: 'application/pdf',
                  upsert: false
                });
              
              if (!uploadError && uploadData) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                  .from(STORAGE_BUCKET_DOCUMENTOS)
                  .getPublicUrl(fileName);
                
                // Atualizar URL do contrato no paciente
                await supabaseAdmin
                  .from('pacientes')
                  .update({ contrato_servico_url: publicUrl })
                  .eq('id', pacienteCompleto.id);
                
                // Salvar no sistema de rastreabilidade
                const nomeDocumento = `Contrato_Assinado_Admin_${pacienteCompleto.nome?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                
                await supabaseAdmin
                  .from('documentos_assinados')
                  .insert({
                    nome: nomeDocumento,
                    assinante: assinaturaAdmin.nome_admin,
                    documento: assinaturaAdmin.documento_admin,
                    hash_sha1: resultadoAssinatura.hashSHA1,
                    chave_validacao: resultadoAssinatura.hashSHA1.substring(0, 10),
                    data_assinatura: new Date().toISOString(),
                    usuario_id: req.user.id,
                    ip_assinatura: req.ip || req.headers['x-forwarded-for'] || 'desconhecido',
                    dispositivo_info: {
                      userAgent: req.headers['user-agent'],
                      timestamp: new Date().toISOString()
                    },
                    integridade_status: 'nao_verificado',
                    validade_juridica: 'simples',
                    auditoria_log: [{
                      tipo: 'assinatura_automatica',
                      data: new Date().toISOString(),
                      ip: req.ip || req.headers['x-forwarded-for'] || 'desconhecido',
                      usuario: req.user.nome || req.user.email
                    }]
                  });
                
                console.log('✅ [ASSINATURA DIGITAL] Contrato assinado automaticamente com sucesso!');
              } else {
                console.error('❌ [ASSINATURA DIGITAL] Erro ao fazer upload do contrato assinado:', uploadError);
              }
            }
          }
        }
      } catch (assinaturaError) {
        console.error('❌ [ASSINATURA DIGITAL] Erro ao aplicar assinatura automática:', assinaturaError);
        // Não bloquear a aprovação se houver erro na assinatura
      }
    }
    
    // Buscar o fechamento atualizado para retornar
    const { data: fechamentoAtualizado, error: errorBuscaAtualizado } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    res.json({ 
      message: 'Fechamento aprovado com sucesso!',
      fechamento: fechamentoAtualizado || data[0],
      success: true
    });
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

// Função para gerar senha aleatória
const gerarSenhaAleatoria = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let senha = '';
  for (let i = 0; i < 8; i++) {
    senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return senha;
};

// POST /api/fechamentos/:id/criar-acesso-freelancer - Criar acesso freelancer para paciente fechado
const criarAcessoFreelancer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permissões: apenas admin ou usuário da incorporadora (empresa_id=5)
    if (req.user.tipo !== 'admin' && req.user.empresa_id !== 5) {
      return res.status(403).json({ error: 'Você não tem permissão para criar acessos freelancer' });
    }

    // Buscar fechamento com dados do paciente
    const { data: fechamento, error: fechamentoError } = await supabaseAdmin
      .from('fechamentos')
      .select(`
        *,
        pacientes(
          id,
          nome,
          email,
          telefone,
          status,
          empresa_id
        )
      `)
      .eq('id', id)
      .single();

    if (fechamentoError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }

    const paciente = fechamento.pacientes;

    // Validar se fechamento está aprovado
    if (fechamento.aprovado !== 'aprovado') {
      return res.status(400).json({ error: 'Fechamento deve estar aprovado para criar acesso freelancer' });
    }

    // Validar se paciente tem status "fechado"
    if (paciente.status !== 'fechado') {
      return res.status(400).json({ error: 'Paciente deve ter status "fechado" para criar acesso freelancer' });
    }

    // Validar se paciente tem email
    if (!paciente.email || paciente.email.trim() === '') {
      return res.status(400).json({ error: 'Paciente deve ter email cadastrado para criar acesso freelancer' });
    }

    // Verificar se email já existe na tabela consultores
    const { data: consultorExistente, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('id')
      .eq('email', paciente.email.trim())
      .limit(1);

    if (consultorError) throw consultorError;

    if (consultorExistente && consultorExistente.length > 0) {
      return res.status(400).json({ error: 'Este email já possui acesso freelancer no sistema' });
    }

    // Gerar senha aleatória
    const senhaTemporaria = gerarSenhaAleatoria();
    
    // Hash da senha
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senhaTemporaria, saltRounds);

    // Preparar dados do consultor
    const consultorData = {
      nome: paciente.nome,
      email: paciente.email.trim(),
      senha: senhaHash,
      telefone: paciente.telefone || null,
      is_freelancer: true,
      ativo: true,
      tipo: 'consultor',
      empresa_id: paciente.empresa_id, // Herdar do fechamento/paciente
      podealterarstatus: false,
      pode_ver_todas_novas_clinicas: false
    };

    // Criar consultor na tabela consultores
    const { data: novoConsultor, error: criarError } = await supabaseAdmin
      .from('consultores')
      .insert([consultorData])
      .select();

    if (criarError) throw criarError;

    const consultorId = novoConsultor[0].id;

    // Gerar código de referência automaticamente
    try {
      const nomeLimpo = paciente.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 10);
      
      const codigoReferencia = `${nomeLimpo}${consultorId}`;
      
      // Atualizar o consultor com o código de referência
      await supabaseAdmin
        .from('consultores')
        .update({ codigo_referencia: codigoReferencia })
        .eq('id', consultorId);
      
      console.log('✅ Código de referência gerado:', codigoReferencia);
    } catch (codigoError) {
      console.error('⚠️ Erro ao gerar código de referência:', codigoError);
    }

    // Enviar email com credenciais
    try {
      const linkAcesso = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      
      const htmlEmail = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Seu Acesso ao Sistema de Indicações</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; }
            .credentials { background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Seu Acesso ao Sistema de Indicações</h1>
            </div>
            
            <div class="content">
              <p>Olá <strong>${paciente.nome}</strong>,</p>
              
              <p>Seu acesso ao sistema de indicações foi criado com sucesso! Agora você pode fazer login, indicar possíveis novos clientes e ganhar com isso!.</p>
              
              <div class="credentials">
                <h3>Suas Credenciais de Acesso:</h3>
                <p><strong>Email:</strong> ${paciente.email}</p>
                <p><strong>Senha Temporária:</strong> ${senhaTemporaria}</p>
              </div>
              
              <p>Para acessar o sistema, clique no botão abaixo:</p>
              <a href="${linkAcesso}" class="button">Fazer Login</a>
              
              <div class="warning">
                <h4>⚠️ Importante:</h4>
                <ul>
                  <li>Esta é uma senha temporária</li>
                  <li>Recomendamos que você altere sua senha após o primeiro login</li>
                  <li>Mantenha suas credenciais seguras</li>
                </ul>
              </div>
              
              <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
              
              <p>Atenciosamente,<br>Equipe IM Solumn</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@crminvest.com',
        to: paciente.email,
        subject: 'Seu acesso ao sistema de indicações',
        html: htmlEmail
      });

      console.log('✅ Email enviado com sucesso para:', paciente.email);
    } catch (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
      // Não falhar a operação se houver erro no email
    }

    res.json({ 
      message: 'Acesso freelancer criado com sucesso! As credenciais foram enviadas para o email do cliente.',
      consultor: {
        id: consultorId,
        nome: paciente.nome,
        email: paciente.email
      }
    });

  } catch (error) {
    console.error('Erro ao criar acesso freelancer:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/fechamentos/:id/boletos - Buscar boletos de um fechamento específico
const getBoletosFechamento = async (req, res) => {
  try {
    const { id } = req.params;
    const fechamentoId = parseInt(id);

    // Verificar se o fechamento existe e se o usuário tem permissão
    const { data: fechamento, error: fechamentoError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, paciente_id, empresa_id, clinica_id, aprovado')
      .eq('id', fechamentoId)
      .single();

    if (fechamentoError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }

    // Verificar permissão: admin pode ver todos, clínica só os seus, paciente só os seus
    if (req.user.tipo === 'clinica') {
      const clinicaId = req.user.clinica_id || req.user.id;
      if (fechamento.clinica_id !== clinicaId) {
        return res.status(403).json({ error: 'Acesso negado. Você só pode ver boletos dos seus próprios fechamentos.' });
      }
    } else if (req.user.tipo === 'paciente') {
      const pacienteId = req.user.paciente_id || req.user.id;
      if (fechamento.paciente_id !== pacienteId) {
        return res.status(403).json({ error: 'Acesso negado. Você só pode ver seus próprios boletos.' });
      }
    } else if (req.user.tipo !== 'admin' && req.user.tipo !== 'consultor') {
      // Verificar se é da mesma empresa
      if (req.user.empresa_id !== fechamento.empresa_id) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }
    }

    // Buscar boletos da tabela boletos_caixa para este fechamento
    // Também buscar boletos do paciente que não têm fechamento_id (boletos importados manualmente)
    const { data: boletosCaixa, error: boletosError } = await supabaseAdmin
      .from('boletos_caixa')
      .select('*')
      .or(`fechamento_id.eq.${fechamentoId},and(fechamento_id.is.null,paciente_id.eq.${fechamento.paciente_id})`)
      .order('data_vencimento', { ascending: true });

    if (boletosError) throw boletosError;

    // Calcular status para cada boleto
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const boletosComStatus = (boletosCaixa || []).map(boleto => {
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
        fechamento_id: boleto.fechamento_id,
        paciente_id: boleto.paciente_id,
        erro_criacao: boleto.erro_criacao
      };
    });

    return res.json({ 
      boletos: boletosComStatus,
      fechamento: {
        id: fechamento.id,
        paciente_id: fechamento.paciente_id,
        aprovado: fechamento.aprovado
      }
    });
  } catch (error) {
    console.error('Erro ao buscar boletos do fechamento:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/fechamentos/:id/gerar-boletos - Gerar boletos manualmente para um fechamento
const gerarBoletosFechamento = async (req, res) => {
  try {
    const { id } = req.params;
    const fechamentoId = parseInt(id);
    
    // Aceitar numero_parcelas opcional no body
    const numeroParcelasBody = req.body.numero_parcelas ? parseInt(req.body.numero_parcelas) : null;
    
    // Aceitar limpar_existentes opcional no body (se true, deleta boletos existentes antes de criar)
    const limparExistentes = req.body.limpar_existentes === true;

    // Verificar se o fechamento existe e se o usuário tem permissão
    const { data: fechamento, error: fechamentoError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, paciente_id, empresa_id, clinica_id, aprovado, numero_parcelas, valor_parcela, valor_fechado, vencimento')
      .eq('id', fechamentoId)
      .single();

    if (fechamentoError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }

    // Verificar permissão: admin pode gerar para todos, clínica só para os seus
    if (req.user.tipo === 'clinica') {
      const clinicaId = req.user.clinica_id || req.user.id;
      if (fechamento.clinica_id !== clinicaId) {
        return res.status(403).json({ error: 'Acesso negado. Você só pode gerar boletos para os seus próprios fechamentos.' });
      }
    } else if (req.user.tipo !== 'admin' && req.user.tipo !== 'consultor') {
      return res.status(403).json({ error: 'Acesso negado. Apenas admin, consultor ou clínica podem gerar boletos.' });
    }

    // Verificar se é empresa_id 3 (Caixa)
    if (fechamento.empresa_id !== 3) {
      return res.status(400).json({ error: 'Este endpoint é apenas para empresa_id 3 (Caixa)' });
    }

    // Validar número de parcelas fornecido no body
    if (numeroParcelasBody !== null) {
      if (isNaN(numeroParcelasBody) || numeroParcelasBody < 1 || numeroParcelasBody > 100) {
        return res.status(400).json({ error: 'Número de parcelas deve ser entre 1 e 100' });
      }
    }

    // Usar numero_parcelas do body se fornecido, senão usar do fechamento
    const numeroParcelasParaUsar = numeroParcelasBody !== null ? numeroParcelasBody : (fechamento.numero_parcelas || 1);
    
    // Calcular valor da parcela baseado no número selecionado
    const valorTotal = parseFloat(fechamento.valor_fechado) || 0;
    const valorParcela = valorTotal / numeroParcelasParaUsar;
    
    // Criar objeto fechamento temporário com os valores ajustados
    const fechamentoAjustado = {
      ...fechamento,
      numero_parcelas: numeroParcelasParaUsar,
      valor_parcela: valorParcela
    };

    // Verificar se já existem boletos para este fechamento
    const { data: boletosExistentes, error: boletosExistentesError } = await supabaseAdmin
      .from('boletos_caixa')
      .select('id, numero_documento, nosso_numero, parcela_numero, status, erro_criacao')
      .eq('fechamento_id', fechamentoId);
    
    if (boletosExistentes && boletosExistentes.length > 0) {
      const boletosSemErro = boletosExistentes.filter(b => !b.erro_criacao);
      const boletosComErro = boletosExistentes.filter(b => b.erro_criacao);
      
      console.log(`📋 [FECHAMENTO ${fechamentoId}] Boletos existentes no banco:`);
      console.log(`   - Total: ${boletosExistentes.length}`);
      console.log(`   - Sem erro: ${boletosSemErro.length}`);
      console.log(`   - Com erro: ${boletosComErro.length}`);
      
      if (boletosSemErro.length > 0) {
        console.log(`   - Boletos válidos encontrados:`);
        boletosSemErro.forEach(b => {
          console.log(`     * ${b.numero_documento} (nosso_numero: ${b.nosso_numero}, parcela: ${b.parcela_numero || 'N/A'})`);
        });
      }
      
      if (boletosComErro.length > 0) {
        console.log(`   - Boletos com erro encontrados:`);
        boletosComErro.forEach(b => {
          console.log(`     * ${b.numero_documento} (erro: ${b.erro_criacao?.substring(0, 50)}...)`);
        });
      }
      
      // Se solicitado, limpar boletos existentes antes de criar novos
      if (limparExistentes) {
        console.log(`🗑️ [FECHAMENTO ${fechamentoId}] Limpando ${boletosExistentes.length} boleto(s) existente(s)...`);
        
        const { error: deleteError } = await supabaseAdmin
          .from('boletos_caixa')
          .delete()
          .eq('fechamento_id', fechamentoId);
        
        if (deleteError) {
          console.error(`❌ Erro ao limpar boletos existentes:`, deleteError);
          return res.status(500).json({ 
            error: 'Erro ao limpar boletos existentes',
            details: deleteError.message 
          });
        }
        
        console.log(`✅ [FECHAMENTO ${fechamentoId}] ${boletosExistentes.length} boleto(s) removido(s) com sucesso`);
      } else {
        console.log(`ℹ️ [FECHAMENTO ${fechamentoId}] Boletos existentes serão mantidos. Use 'limpar_existentes: true' no body para limpar antes de criar novos.`);
      }
    }

    // Buscar dados completos do paciente
    const { data: pacienteCompleto, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('*')
      .eq('id', fechamento.paciente_id)
      .single();

    if (pacienteError || !pacienteCompleto) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Buscar CNPJ da empresa beneficiária (necessário para o payload conforme manual)
    const { data: empresaData, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('cnpj')
      .eq('id', fechamento.empresa_id)
      .single();

    // CNPJ correto da INVESTMONEY SECURITIZADORA DE CREDITOS S/A
    const CNPJ_CORRETO = '41267440000197';
    let cnpjParaUsar = null;

    if (empresaError || !empresaData || !empresaData.cnpj) {
      console.warn('⚠️ [CAIXA] Não foi possível buscar CNPJ da empresa. Usando CNPJ padrão da INVESTMONEY.');
      cnpjParaUsar = CNPJ_CORRETO;
    } else {
      // Normalizar CNPJ (remover formatação)
      const cnpjNormalizado = empresaData.cnpj.replace(/\D/g, '');
      
      // Validar se o CNPJ está correto (14 dígitos e corresponde ao da INVESTMONEY)
      if (cnpjNormalizado.length === 14 && cnpjNormalizado === CNPJ_CORRETO) {
        cnpjParaUsar = cnpjNormalizado;
        console.log(`✅ [CAIXA] CNPJ validado e correto: ${cnpjParaUsar}`);
      } else {
        console.warn(`⚠️ [CAIXA] CNPJ do banco (${cnpjNormalizado}) não corresponde ao CNPJ cadastrado na Caixa (${CNPJ_CORRETO}). Usando CNPJ correto.`);
        cnpjParaUsar = CNPJ_CORRETO;
      }
    }

    // Obter ID do beneficiário
    const idBeneficiarioRaw = process.env.CAIXA_ID_BENEFICIARIO;
    
    if (!idBeneficiarioRaw) {
      return res.status(500).json({ error: 'CAIXA_ID_BENEFICIARIO não configurado no servidor' });
    }

    // Normalizar ID do beneficiário (pode vir como "0374/1242669" ou apenas "1242669")
    // IMPORTANTE: Conforme Swagger, o parâmetro na URL deve ser "integer", não string com barra
    // Portanto, sempre extrair apenas o código numérico para usar na URL
    let idBeneficiario;
    
    if (idBeneficiarioRaw.includes('/')) {
      // Extrair apenas o código numérico após a barra
      idBeneficiario = idBeneficiarioRaw.split('/')[1].trim();
      console.log(`📋 [CAIXA] Extraindo código do beneficiário: ${idBeneficiarioRaw} -> ${idBeneficiario}`);
    } else {
      // Já está no formato numérico
      idBeneficiario = idBeneficiarioRaw.trim();
    }

    // Criar boletos na Caixa usando o fechamento ajustado
    console.log(`🚀 [BOLETO] Iniciando criação de ${numeroParcelasParaUsar} boletos para fechamento ${fechamentoId}`);
    
    const boletosCriados = await criarBoletosCaixa(
      fechamentoAjustado,
      pacienteCompleto,
      idBeneficiario,
      cnpjParaUsar // Passar CNPJ validado/correto da empresa beneficiária
    );

    console.log(`✅ [BOLETO] Processo concluído. ${boletosCriados.length} boleto(s) criado(s) de ${numeroParcelasParaUsar} solicitado(s)`);

    if (boletosCriados.length > 0) {
      return res.json({
        success: true,
        message: `${boletosCriados.length} boleto(s) criado(s) com sucesso${boletosCriados.length < numeroParcelasParaUsar ? ` (de ${numeroParcelasParaUsar} solicitado(s))` : ''}`,
        boletos: boletosCriados.map(b => ({
          id: b.id,
          nosso_numero: b.nosso_numero,
          numero_documento: b.numero_documento,
          valor: b.valor,
          data_vencimento: b.data_vencimento,
          url: b.url,
          linha_digitavel: b.linha_digitavel
        })),
        total_solicitado: numeroParcelasParaUsar,
        total_criado: boletosCriados.length
      });
    } else {
      return res.status(400).json({
        error: 'Nenhum boleto foi criado',
        message: `Nenhum dos ${numeroParcelasParaUsar} boleto(s) solicitado(s) foi criado com sucesso. Verifique os logs do servidor para mais detalhes. Possíveis causas: paciente sem CPF, erro na API Caixa, ou dados inválidos.`
      });
    }

  } catch (error) {
    console.error('Erro ao gerar boletos do fechamento:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
};

/**
 * Visualizar boleto como HTML formatado
 * GET /api/fechamentos/:id/boletos/:boletoId/visualizar
 */
const visualizarBoleto = async (req, res) => {
  try {
    const { id, boletoId } = req.params;
    const fechamentoId = parseInt(id);
    const boletoIdInt = parseInt(boletoId);

    // Buscar boleto
    const { data: boleto, error: boletoError } = await supabaseAdmin
      .from('boletos_caixa')
      .select('*')
      .eq('id', boletoIdInt)
      .eq('fechamento_id', fechamentoId)
      .single();

    if (boletoError || !boleto) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>Boleto não encontrado</h1>
            <p>O boleto solicitado não foi encontrado no sistema.</p>
          </body>
        </html>
      `);
    }

    // Verificar permissão: admin pode ver todos, clínica só os seus, paciente só os seus
    if (req.user.tipo === 'clinica') {
      const clinicaId = req.user.clinica_id || req.user.id;
      const { data: fechamentoCheck } = await supabaseAdmin
        .from('fechamentos')
        .select('clinica_id')
        .eq('id', fechamentoId)
        .single();
      if (fechamentoCheck && fechamentoCheck.clinica_id !== clinicaId) {
        return res.status(403).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>Acesso negado</h1>
              <p>Você só pode visualizar boletos dos seus próprios fechamentos.</p>
            </body>
          </html>
        `);
      }
    } else if (req.user.tipo === 'paciente') {
      const pacienteId = req.user.paciente_id || req.user.id;
      const { data: fechamentoCheck } = await supabaseAdmin
        .from('fechamentos')
        .select('paciente_id')
        .eq('id', fechamentoId)
        .single();
      if (fechamentoCheck && fechamentoCheck.paciente_id !== pacienteId) {
        return res.status(403).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>Acesso negado</h1>
              <p>Você só pode visualizar seus próprios boletos.</p>
            </body>
          </html>
        `);
      }
    }

    // Buscar dados do fechamento
    const { data: fechamento, error: fechamentoError } = await supabaseAdmin
      .from('fechamentos')
      .select('id, paciente_id, valor_fechado, numero_parcelas, clinica_id, empresa_id')
      .eq('id', fechamentoId)
      .single();

    // Buscar dados do paciente
    const { data: paciente, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('nome, cpf, email, telefone, endereco, bairro, numero, cidade, estado, cep')
      .eq('id', boleto.paciente_id)
      .single();

    // Buscar dados da empresa beneficiária
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('nome, cnpj')
      .eq('id', fechamento?.empresa_id || 3)
      .single();

    // Formatar data de vencimento
    const dataVencimento = new Date(boleto.data_vencimento + 'T00:00:00');
    const dataVencimentoFormatada = dataVencimento.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Formatar valor
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(boleto.valor);

    // Formatar linha digitável com espaçamento (padrão FEBRABAN: 10491.24264 69000.100045 00008.930646 4 12710000049500)
    const linhaDigitavel = (boleto.linha_digitavel || '').replace(/\D/g, ''); // Remover caracteres não numéricos
    let linhaFormatada = linhaDigitavel;
    
    console.log('📊 [BOLETO] Linha digitável original:', boleto.linha_digitavel);
    console.log('📊 [BOLETO] Linha digitável limpa:', linhaDigitavel, 'Tamanho:', linhaDigitavel.length);
    console.log('📊 [BOLETO] Código de barras:', boleto.codigo_barras, 'Tamanho:', boleto.codigo_barras?.length);
    
    if (linhaDigitavel.length === 47) {
      // Formato FEBRABAN padrão: 10491.24264 69000.100045 00008.930646 4 12710000049500
      // Posições: 5 + ponto + 5 + espaço + 5 + ponto + 6 + espaço + 5 + ponto + 6 + espaço + 1 + espaço + 14
      linhaFormatada = linhaDigitavel.substring(0, 5) + '.' +
                       linhaDigitavel.substring(5, 10) + ' ' +
                       linhaDigitavel.substring(10, 15) + '.' +
                       linhaDigitavel.substring(15, 21) + ' ' +
                       linhaDigitavel.substring(21, 26) + '.' +
                       linhaDigitavel.substring(26, 32) + ' ' +
                       linhaDigitavel.substring(32, 33) + ' ' +
                       linhaDigitavel.substring(33, 47);
      console.log('✅ [BOLETO] Linha digitável formatada corretamente');
    } else if (linhaDigitavel.length > 0) {
      // Se não tiver 47 caracteres, tentar formatar do melhor jeito possível
      console.warn('⚠️ [BOLETO] Linha digitável com tamanho inválido:', linhaDigitavel.length, 'esperado: 47');
      linhaFormatada = linhaDigitavel.substring(0, 5) + '.' +
                       linhaDigitavel.substring(5, 10) + ' ' +
                       linhaDigitavel.substring(10, 15) + '.' +
                       linhaDigitavel.substring(15, 21) + ' ' +
                       linhaDigitavel.substring(21, 26) + '.' +
                       linhaDigitavel.substring(26, 32) + ' ' +
                       linhaDigitavel.substring(32, 33) + ' ' +
                       linhaDigitavel.substring(33);
    } else {
      console.warn('⚠️ [BOLETO] Linha digitável vazia ou inválida');
      linhaFormatada = '00000.00000 00000.000000 00000.000000 0 00000000000000';
    }

    // Função para gerar código de barras ITF (Interleaved 2 of 5) usando CSS - MELHORADA
    const gerarCodigoBarrasCSS = (codigo) => {
      if (!codigo || codigo.length !== 44) {
        console.warn('⚠️ [BOLETO] Código de barras inválido:', codigo, 'Tamanho:', codigo?.length);
        return '<div style="color: red; padding: 10px; font-size: 10px;">⚠️ Código de barras inválido (esperado: 44 dígitos, recebido: ' + (codigo?.length || 0) + ')</div>';
      }
      
      console.log('✅ [BOLETO] Gerando código de barras para:', codigo.substring(0, 10) + '...');
      
      // Padrões Interleaved 2 of 5 (ITF) para cada dígito
      // N = Narrow (barra fina), W = Wide (barra grossa)
      const patterns = {
        '0': 'NNWWN', // 0-0-1-1-0
        '1': 'WNNNW', // 1-0-0-0-1
        '2': 'NWNNW', // 0-1-0-0-1
        '3': 'WWNNN', // 1-1-0-0-0
        '4': 'NNWNW', // 0-0-1-0-1
        '5': 'WNWNN', // 1-0-1-0-0
        '6': 'NWWNN', // 0-1-1-0-0
        '7': 'NNNWW', // 0-0-0-1-1
        '8': 'WNNWN', // 1-0-0-1-0
        '9': 'NWNWN'  // 0-1-0-1-0
      };
      
      let barrasHTML = '<div style="display: inline-block; width: 390px; height: 49px; background: white; padding: 5px 10px; white-space: nowrap; overflow: hidden;">';
      
      // Start pattern (4 elementos: barra preta fina, espaço branco fino, barra preta fina, espaço branco fino)
      barrasHTML += '<span style="display: inline-block; width: 2px; height: 100%; background: black; margin-right: 0;"></span>';
      barrasHTML += '<span style="display: inline-block; width: 2px; height: 100%; background: white; margin-right: 0;"></span>';
      barrasHTML += '<span style="display: inline-block; width: 2px; height: 100%; background: black; margin-right: 0;"></span>';
      barrasHTML += '<span style="display: inline-block; width: 2px; height: 100%; background: white; margin-right: 0;"></span>';
      
      // Processar pares de dígitos (Interleaved 2 of 5 sempre trabalha com pares)
      // Como temos 44 dígitos, são 22 pares
      for (let i = 0; i < codigo.length; i += 2) {
        const digit1 = codigo[i];
        const digit2 = codigo[i + 1];
        
        if (!digit1 || !digit2) break; // Parar se não houver mais pares
        
        const pattern1 = patterns[digit1] || 'NNNNN';
        const pattern2 = patterns[digit2] || 'NNNNN';
        
        // Intercalar os padrões: barras pretas (digit1) e espaços brancos (digit2)
        for (let j = 0; j < 5; j++) {
          const isWide1 = pattern1[j] === 'W';
          const isWide2 = pattern2[j] === 'W';
          
          // Barra preta (do digit1)
          const widthBarra = isWide1 ? 4 : 2;
          barrasHTML += `<span style="display: inline-block; width: ${widthBarra}px; height: 100%; background: black; margin-right: 0;"></span>`;
          
          // Espaço branco (do digit2)
          const widthEspaco = isWide2 ? 4 : 2;
          barrasHTML += `<span style="display: inline-block; width: ${widthEspaco}px; height: 100%; background: white; margin-right: 0;"></span>`;
        }
      }
      
      // Não deve haver dígito ímpar com 44 dígitos, mas removendo essa parte por segurança
      
      // Stop pattern (3 elementos: barra preta grossa, espaço branco fino, barra preta fina)
      barrasHTML += '<span style="display: inline-block; width: 4px; height: 100%; background: black; margin-right: 0;"></span>';
      barrasHTML += '<span style="display: inline-block; width: 2px; height: 100%; background: white; margin-right: 0;"></span>';
      barrasHTML += '<span style="display: inline-block; width: 2px; height: 100%; background: black; margin-right: 0;"></span>';
      
      barrasHTML += '</div>';
      
      console.log('✅ [BOLETO] Código de barras gerado com sucesso');
      return barrasHTML;
    };

    // Buscar dados da clínica (beneficiário final)
    const { data: clinica } = await supabaseAdmin
      .from('clinicas')
      .select('nome, cidade, uf')
      .eq('id', fechamento?.clinica_id)
      .single();

    // Formatar data de emissão
    const dataEmissao = new Date(boleto.data_emissao + 'T00:00:00');
    const dataEmissaoFormatada = dataEmissao.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Formatação do endereço do pagador (se disponível)
    let enderecoPagador = '';
    if (paciente) {
      const partesEndereco = [];
      if (paciente.endereco) partesEndereco.push(paciente.endereco);
      if (paciente.numero) partesEndereco.push(paciente.numero);
      if (paciente.bairro) partesEndereco.push(paciente.bairro);
      if (paciente.cidade && paciente.estado) {
        partesEndereco.push(`${paciente.cidade}/${paciente.estado}`);
      }
      if (paciente.cep) {
        const cepFormatado = paciente.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
        partesEndereco.push(`CEP: ${cepFormatado}`);
      }
      enderecoPagador = partesEndereco.join(' - ');
    }

    // Calcular multa (10% do valor)
    const valorMulta = (boleto.valor * 0.10).toFixed(2);
    const valorMultaFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorMulta);

    // Data de início de juros (um dia após vencimento)
    const dataJuros = new Date(boleto.data_vencimento + 'T00:00:00');
    dataJuros.setDate(dataJuros.getDate() + 1);
    const dataJurosFormatada = dataJuros.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // CNPJ fixo da empresa beneficiária
    const CNPJ_EMPRESA_FIXO = '41267440000197';
    const CNPJ_EMPRESA_FORMATADO = '41.267.440/0001-97';

    // Formatar endereço do beneficiário
    const enderecoBeneficiario = 'FRANCISCO ROCHA, 198,-BATEL/CURITIBA';
    const cepBeneficiario = '80420-130';
    const ufBeneficiario = 'PR';

    // Formatar endereço do pagador
    let enderecoPagadorFormatado = '';
    if (paciente) {
      const partes = [];
      if (paciente.endereco) partes.push(paciente.endereco.toUpperCase());
      if (paciente.numero) partes.push(paciente.numero);
      if (paciente.bairro) partes.push(paciente.bairro.toUpperCase());
      if (paciente.cidade) partes.push(paciente.cidade.toUpperCase());
      enderecoPagadorFormatado = partes.join(',');
    }

    // HTML do boleto no padrão FEBRABAN/Caixa - IDÊNTICO AO ORIGINAL
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boleto - ${boleto.numero_documento || 'Boleto'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 7px;
      background: #fff;
      padding: 0;
      color: #000;
      line-height: 1.1;
    }
    .actions-bar {
      max-width: 800px;
      margin: 0 auto;
      padding: 10px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .actions-bar button {
      padding: 8px 16px;
      border: 1px solid #0066cc;
      background: #0066cc;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .actions-bar button:hover {
      background: #0052a3;
      border-color: #0052a3;
    }
    .actions-bar button:active {
      transform: translateY(1px);
    }
    .boleto-wrapper {
      padding: 10px;
    }
    .boleto-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border: 1px solid #ccc;
    }
    
    /* Header com gradiente Caixa - IDÊNTICO */
    .header-banco {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 3px 6px;
      border: 2px solid #000;
      border-bottom: none;
      background: linear-gradient(90deg, #00b5a6 0%, #0066cc 100%);
      color: white;
      height: 32px;
    }
    .header-left {
      display: flex;
      align-items: center;
      flex: 1;
    }
    .logo-banco {
      font-size: 13px;
      font-weight: 600;
      color: #b3e5d1;
      display: inline-block;
      vertical-align: middle;
    }
    .logo-banco .caixa {
      color: white;
      font-weight: 900;
      font-size: 15px;
    }
    .logo-banco .caixa .x {
      display: inline-block;
      background: linear-gradient(180deg, #ffd700 0%, #ff8c00 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 900;
    }
    .codigo-banco {
      font-size: 18px;
      font-weight: 900;
      border-left: 2px solid white;
      border-right: 2px solid white;
      padding: 0 8px;
      margin: 0 6px;
      height: 26px;
      display: flex;
      align-items: center;
      color: white;
    }
    .linha-digitavel-header {
      font-size: 10px; /* Ajustado conforme especificação: 3,5-4mm */
      font-family: 'Courier New', monospace;
      font-weight: bold;
      letter-spacing: 1px; /* Reduzido para melhor proporção */
      color: white;
      flex: 1;
      text-align: right;
    }
    
    /* Tabela principal - IDÊNTICA À CAIXA */
    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
      font-size: 7px;
    }
    td {
      border: 1px solid #000;
      padding: 1px 3px;
      vertical-align: top;
      font-size: 7px;
      line-height: 1.1;
      height: auto;
    }
    .campo-label {
      font-size: 5.5px;
      font-weight: normal;
      display: block;
      margin-bottom: 0;
      color: #000;
      line-height: 1;
    }
    .campo-valor {
      font-weight: bold;
      font-size: 8px;
      text-transform: uppercase;
      display: block;
      line-height: 1.1;
      margin-top: 1px;
    }
    .campo-valor-numero {
      font-weight: bold;
      font-size: 8px;
      display: block;
      line-height: 1.1;
      margin-top: 1px;
    }
    
    /* Valores destacados */
    .valor-documento {
      background: #e8e8e8;
      font-weight: bold;
      font-size: 10px;
      text-align: right;
      padding-right: 3px;
    }
    .valor-documento .campo-valor-numero {
      font-size: 11px;
    }
    .vencimento {
      background: #e8e8e8;
      font-weight: bold;
      font-size: 10px;
      text-align: right;
      padding-right: 3px;
    }
    .vencimento .campo-valor-numero {
      font-size: 11px;
    }
    
    /* Instruções */
    .instrucoes {
      font-size: 6.5px;
      line-height: 1.3;
      padding-top: 1px;
    }
    
    /* Linha pontilhada de corte */
    .linha-corte {
      border-bottom: 1px dashed #999;
      margin: 12px 0;
      padding-bottom: 6px;
      text-align: right;
      font-size: 6px;
      color: #666;
    }
    .linha-corte::after {
      content: "✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -";
    }
    
    /* Código de barras */
    .codigo-barras {
      text-align: center;
      margin: 0;
      padding: 6px;
      border: 2px solid #000;
      border-top: none;
      background: white;
    }
    .codigo-barras-visual {
      display: inline-block;
      width: 390px; /* 103mm conforme especificação */
      height: 49px; /* 13mm conforme especificação */
      background: white;
      padding: 5px 10px;
      white-space: nowrap;
      overflow: hidden; /* Garante que não ultrapasse o limite */
    }
    .codigo-barras-numero {
      margin-top: 2px;
      font-size: 8px;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.5px;
    }
    
    /* Autenticação mecânica */
    .autenticacao-mecanica {
      text-align: center;
      font-size: 5.5px;
      color: #666;
      padding: 4px;
      margin-top: 6px;
    }
    
    /* Footer com contatos */
    .footer-contatos {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px dashed #999;
      font-size: 5.5px;
      text-align: center;
      color: #666;
      line-height: 1.4;
    }
    
    /* Ajustes específicos para campos */
    .td-right {
      text-align: right;
    }
    .td-center {
      text-align: center;
    }
    
    /* Ajustes de altura para células específicas */
    .altura-instrucoes {
      height: 60px;
    }
    
    /* Ficha de Compensação - Dimensões conforme especificação */
    .ficha-compensacao {
      min-height: 360px; /* 95mm em 96dpi */
      max-height: 408px; /* 108mm em 96dpi */
    }
    
    @media print {
      body {
        padding: 0;
        background: white;
      }
      .actions-bar {
        display: none;
      }
      .boleto-wrapper {
        padding: 0;
      }
      .boleto-container {
        border: none;
      }
      .linha-corte {
        page-break-after: always;
      }
    }
  </style>
  <script>
    function imprimirBoleto() {
      window.print();
    }
    
    function baixarBoleto() {
      const elemento = document.querySelector('.boleto-wrapper');
      const opt = {
        margin: 0,
        filename: 'boleto_${boleto.nosso_numero || boleto.numero_documento || 'download'}.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 4, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Criar script para html2pdf se não existir
      if (!window.html2pdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => {
          window.html2pdf().set(opt).from(elemento).save();
        };
        document.head.appendChild(script);
      } else {
        window.html2pdf().set(opt).from(elemento).save();
      }
    }
  </script>
</head>
<body>
  <div class="actions-bar">
    <button onclick="imprimirBoleto()">🖨️ Imprimir</button>
    <button onclick="baixarBoleto()">📥 Baixar PDF</button>
  </div>
  
  <div class="boleto-wrapper">
    <div class="boleto-container">
      <!-- RECIBO DO PAGADOR -->
      <div class="recibo-pagador">
      <div class="header-banco">
        <div class="header-left">
          <span class="logo-banco">cobrança <span class="caixa">CAI<span class="x">X</span>A</span></span>
        </div>
        <div class="codigo-banco">104-0</div>
        <div class="linha-digitavel-header">${linhaFormatada}</div>
      </div>
      
      <table>
        <tr>
          <td style="width: 55%;">
            <span class="campo-label">Beneficiário</span>
            <span class="campo-valor">INVESTMONEY SECURITIZADORA DE CREDITOS S</span>
          </td>
          <td class="td-right" style="width: 45%;">
            <span class="campo-label">CPF/CNPJ</span>
            <span class="campo-valor-numero">${CNPJ_EMPRESA_FORMATADO}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <span class="campo-label">Endereço do Beneficiário</span>
            <span class="campo-valor" style="font-size: 8px;">${enderecoBeneficiario}</span>
          </td>
          <td class="td-right" style="width: 8%;">
            <span class="campo-label">UF</span>
            <span class="campo-valor-numero">${ufBeneficiario}</span>
          </td>
          <td class="td-right" style="width: 12%;">
            <span class="campo-label">CEP</span>
            <span class="campo-valor-numero">${cepBeneficiario}</span>
          </td>
        </tr>
        <tr>
          <td style="width: 14%;">
            <span class="campo-label">Data Documento</span>
            <span class="campo-valor-numero">${dataEmissaoFormatada}</span>
          </td>
          <td style="width: 18%;">
            <span class="campo-label">Dt. de Processamento</span>
            <span class="campo-valor-numero">${dataEmissaoFormatada}</span>
          </td>
          <td style="width: 22%;">
            <span class="campo-label">Num. Documento</span>
            <span class="campo-valor-numero">${boleto.numero_documento || 'N/A'}</span>
          </td>
          <td style="width: 18%;">
            <span class="campo-label">Ag./Cod. Beneficiário</span>
            <span class="campo-valor-numero">0374/1242669</span>
          </td>
          <td style="width: 18%;">
            <span class="campo-label">Nosso Número</span>
            <span class="campo-valor-numero">${boleto.nosso_numero || 'N/A'}</span>
          </td>
        </tr>
        <tr>
          <td colspan="4" style="width: 72%;">
            <span class="campo-label">Pagador</span>
            <span class="campo-valor">${(paciente?.nome || 'N/A').toUpperCase()}</span>
          </td>
          <td class="td-right" style="width: 28%;">
            <span class="campo-label">CPF/CNPJ</span>
            <span class="campo-valor-numero">${paciente?.cpf ? paciente.cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A'}</span>
          </td>
        </tr>
        <tr>
          <td colspan="4">
            <span class="campo-label">Endereço do Pagador</span>
            <span class="campo-valor" style="font-size: 8px;">${enderecoPagadorFormatado || 'RUA LEANDRO BARRETO,,-JARDIM SAO PAUL/RECIFE'}</span>
          </td>
          <td class="td-right">
            <span class="campo-label">UF</span>
            <span class="campo-valor-numero">${paciente?.estado || 'PE'}</span>
          </td>
          <td class="td-right">
            <span class="campo-label">CEP</span>
            <span class="campo-valor-numero">${paciente?.cep ? paciente.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '50790-000'}</span>
          </td>
        </tr>
        <tr>
          <td colspan="4">
            <span class="campo-label">Sacador/Avalista</span>
            <span class="campo-valor"></span>
          </td>
          <td colspan="2" class="td-right">
            <span class="campo-label">CPF/CNPJ</span>
            <span class="campo-valor-numero"></span>
          </td>
        </tr>
        <tr>
          <td colspan="3" class="altura-instrucoes" style="vertical-align: top;">
            <span class="campo-label">Instruções (Texto de Responsabilidade do Beneficiário)</span>
            <div class="instrucoes">
              NAO RECEBER APOS 30 DIAS DE ATRASO<br>
              <strong>JUROS :</strong> 8,00% AO MES (DIAS CORRIDOS) A PARTIR DE: ${dataJurosFormatada}<br>
              <strong>MULTA :</strong> ${valorMultaFormatado.replace('R$', '').trim()} REAIS A PARTIR DE ${dataJurosFormatada}
            </div>
          </td>
          <td class="td-center" style="vertical-align: top;">
            <span class="campo-label">Aceite</span>
            <span class="campo-valor-numero">NAO</span>
          </td>
          <td class="td-center" style="vertical-align: top;">
            <span class="campo-label">Carteira</span>
            <span class="campo-valor-numero">RG</span>
          </td>
          <td class="td-center" style="vertical-align: top;">
            <span class="campo-label">Espécie</span>
            <span class="campo-valor-numero">DS</span>
          </td>
        </tr>
      </table>
      
      <div class="autenticacao-mecanica">
        Autenticação Mecânica - Recibo do Pagador
      </div>
    </div>
    
    <div class="linha-corte"></div>
    
    <!-- FICHA DE COMPENSAÇÃO -->
    <div class="ficha-compensacao">
      <div class="header-banco">
        <div class="header-left">
          <span class="logo-banco">cobrança <span class="caixa">CAI<span class="x">X</span>A</span></span>
        </div>
        <div class="codigo-banco">104-0</div>
        <div class="linha-digitavel-header">${linhaFormatada}</div>
      </div>
      
      <table>
        <tr>
          <td colspan="6" style="width: 73%;">
            <span class="campo-label">Local de Pagamento</span>
            <span class="campo-valor" style="font-size: 9px;">PREFERENCIALMENTE NAS CASAS LOTÉRICAS ATÉ O VALOR LIMITE</span>
          </td>
          <td class="vencimento" style="width: 27%;">
            <span class="campo-label">Vencimento</span>
            <span class="campo-valor-numero" style="font-size: 12px;">${dataVencimentoFormatada}</span>
          </td>
        </tr>
        <tr>
          <td colspan="6">
            <span class="campo-label">Beneficiário</span>
            <span class="campo-valor">INVESTMONEY SECURITIZADORA DE CREDITOS S</span>
          </td>
          <td class="td-right">
            <span class="campo-label">Ag./Cod. Beneficiário</span>
            <span class="campo-valor-numero">0374/1242669</span>
          </td>
        </tr>
        <tr>
          <td colspan="6">
            <span class="campo-label">Endereço do Beneficiário</span>
            <span class="campo-valor" style="font-size: 8px;">${enderecoBeneficiario}</span>
          </td>
          <td class="td-right">
            <span class="campo-label">UF</span>
            <span class="campo-valor-numero">${ufBeneficiario}</span>
          </td>
          <td class="td-right">
            <span class="campo-label">CEP</span>
            <span class="campo-valor-numero">${cepBeneficiario}</span>
          </td>
        </tr>
        <tr>
          <td style="width: 11%;">
            <span class="campo-label">Data do Documento</span>
            <span class="campo-valor-numero">${dataEmissaoFormatada}</span>
          </td>
          <td style="width: 14%;">
            <span class="campo-label">Num. Documento</span>
            <span class="campo-valor-numero">${boleto.numero_documento || 'N/A'}</span>
          </td>
          <td style="width: 7%;">
            <span class="campo-label">Espécie Doc.</span>
            <span class="campo-valor-numero">DS</span>
          </td>
          <td style="width: 7%;">
            <span class="campo-label">Aceite</span>
            <span class="campo-valor-numero">NAO</span>
          </td>
          <td style="width: 14%;">
            <span class="campo-label">Data do Processamento</span>
            <span class="campo-valor-numero">${dataEmissaoFormatada}</span>
          </td>
          <td colspan="2" class="td-right">
            <span class="campo-label">Nosso Número</span>
            <span class="campo-valor-numero">${boleto.nosso_numero || 'N/A'}</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="campo-label">Uso do Banco</span>
            <span class="campo-valor-numero">&nbsp;</span>
          </td>
          <td>
            <span class="campo-label">Carteira</span>
            <span class="campo-valor-numero">RG</span>
          </td>
          <td>
            <span class="campo-label">Espécie Moeda</span>
            <span class="campo-valor-numero">R$</span>
          </td>
          <td>
            <span class="campo-label">Qtde. Moeda</span>
            <span class="campo-valor-numero">&nbsp;</span>
          </td>
          <td>
            <span class="campo-label">xValor</span>
            <span class="campo-valor-numero">&nbsp;</span>
          </td>
          <td class="valor-documento td-right">
            <span class="campo-label">(=) Valor do Documento</span>
            <span class="campo-valor-numero">${valorFormatado}</span>
          </td>
        </tr>
        <tr>
          <td colspan="6" rowspan="5" style="vertical-align: top;">
            <span class="campo-label">Instruções (Texto de responsabilidade do Beneficiário)</span>
            <div class="instrucoes">
              NAO RECEBER APOS 30 DIAS DE ATRASO<br>
              <strong>JUROS :</strong> 8,00% AO MES (DIAS CORRIDOS) A PARTIR DE: ${dataJurosFormatada}<br>
              <strong>MULTA :</strong> ${valorMultaFormatado.replace('R$', '').trim()} REAIS A PARTIR DE ${dataJurosFormatada}
            </div>
          </td>
          <td class="valor-documento td-right">
            <span class="campo-label">(=) Valor do Documento</span>
            <span class="campo-valor-numero" style="font-size: 12px;">${valorFormatado}</span>
          </td>
        </tr>
        <tr>
          <td class="td-right">
            <span class="campo-label">(-) Desconto</span>
            <span class="campo-valor-numero">&nbsp;</span>
          </td>
        </tr>
        <tr>
          <td class="td-right">
            <span class="campo-label">(-) Outras Deduções/Abatimento</span>
            <span class="campo-valor-numero">&nbsp;</span>
          </td>
        </tr>
        <tr>
          <td class="td-right">
            <span class="campo-label">(+) Mora/Multa/Juros</span>
            <span class="campo-valor-numero">&nbsp;</span>
          </td>
        </tr>
        <tr>
          <td class="td-right">
            <span class="campo-label">(+) Outros Acréscimos</span>
            <span class="campo-valor-numero">&nbsp;</span>
          </td>
        </tr>
        <tr>
          <td colspan="6">
            <span class="campo-label">Pagador</span>
            <span class="campo-valor">${(paciente?.nome || 'N/A').toUpperCase()}</span>
          </td>
          <td colspan="2" class="td-right">
            <span class="campo-label">CPF/CNPJ</span>
            <span class="campo-valor-numero">${paciente?.cpf ? paciente.cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A'}</span>
          </td>
        </tr>
        <tr>
          <td colspan="6">
            <span class="campo-label">Endereço</span>
            <span class="campo-valor" style="font-size: 8px;">${enderecoPagadorFormatado || 'RUA LEANDRO BARRETO,,-JARDIM SAO PAUL/RECIFE'}</span>
          </td>
          <td class="td-right">
            <span class="campo-label">UF:${paciente?.estado || 'PE'}</span>
          </td>
          <td class="td-right">
            <span class="campo-label">CEP: ${paciente?.cep ? paciente.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '50790-000'}</span>
          </td>
        </tr>
        <tr>
          <td colspan="5">
            <span class="campo-label">Sacador/Avalista</span>
            <span class="campo-valor"></span>
          </td>
          <td colspan="3" class="td-right">
            <span class="campo-label">CPF/CNPJ</span>
            <span class="campo-valor-numero"></span>
          </td>
        </tr>
      </table>
      
      <!-- Código de Barras -->
      <div class="codigo-barras">
        ${boleto.codigo_barras ? gerarCodigoBarrasCSS(boleto.codigo_barras) : '<div style="color: red; padding: 10px;">Código de barras não disponível</div>'}
        <div class="codigo-barras-numero">${boleto.codigo_barras || 'N/A'}</div>
      </div>
      
      <div class="autenticacao-mecanica">
        Autenticação Mecânica - FICHA DE COMPENSAÇÃO
      </div>
    </div>
    
    <div class="footer-contatos">
      SAC CAIXA: 0800 726 0101 (informações, reclamações, sugestões e elogios)<br>
      Para pessoas com deficiência auditiva ou de fala: 0800 726 2492<br>
      Ouvidoria: 0800 725 7474<br>
      www.caixa.gov.br
    </div>
  </div>
  </div> <!-- Fechando boleto-wrapper -->
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Erro ao visualizar boleto:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>Erro ao carregar boleto</h1>
          <p>Ocorreu um erro ao carregar o boleto. Por favor, tente novamente mais tarde.</p>
        </body>
      </html>
    `);
  }
};

// GET /api/fechamentos/hash/:paciente_id - Buscar hash do fechamento pelo paciente_id
const getHashFechamentoPorPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    
    // Buscar o fechamento mais recente do paciente com hash
    const { data: fechamento, error } = await supabaseAdmin
      .from('fechamentos')
      .select('id, contrato_hash_sha1, contrato_hash_criado_em')
      .eq('paciente_id', paciente_id)
      .not('contrato_hash_sha1', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
      throw error;
    }
    
    if (!fechamento || !fechamento.contrato_hash_sha1) {
      return res.status(404).json({ 
        error: 'Hash do contrato não encontrado para este paciente',
        temHash: false 
      });
    }
    
    res.json({
      hash: fechamento.contrato_hash_sha1,
      hash_criado_em: fechamento.contrato_hash_criado_em,
      fechamento_id: fechamento.id,
      temHash: true
    });
  } catch (error) {
    console.error('Erro ao buscar hash do fechamento:', error);
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
  getBoletosFechamento,
  aprovarFechamento,
  reprovarFechamento,
  criarAcessoFreelancer,
  gerarBoletosFechamento,
  visualizarBoleto,
  getHashFechamentoPorPaciente
};
