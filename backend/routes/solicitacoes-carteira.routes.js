const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/solicitacoes-carteira - Buscar solicitações
router.get('/solicitacoes-carteira', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/solicitacoes-carteira chamado');
    console.log('👤 Usuário:', req.user.tipo, 'ID:', req.user.id);
    console.log('🔍 URL completa:', req.originalUrl);
    
    let query = supabaseAdmin
      .from('solicitacoes_carteira')
      .select('*')
      .order('created_at', { ascending: false });

    // Se for clínica, mostrar apenas suas solicitações
    if (req.user.tipo === 'clinica') {
      console.log('🔍 Filtrando por clínica ID:', req.user.id);
      query = query.eq('clinica_id', req.user.id);
    }
    // Admin e consultores veem todas as solicitações (sem filtro de empresa no nível da solicitação)

    console.log('🔄 Executando query no Supabase...');
    const { data, error } = await query;
    console.log('✅ Query executada');

    if (error) {
      console.error('❌ Erro ao buscar solicitações:', error);
      console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
      
      // Se a tabela não existe ou há problema de schema
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('⚠️ ERRO: Tabela solicitacoes_carteira não existe no banco de dados!');
        return res.status(500).json({ 
          error: 'Tabela solicitacoes_carteira não encontrada', 
          details: 'A tabela precisa ser criada no banco de dados',
          errorCode: error.code 
        });
      }
      
      return res.status(500).json({ error: 'Erro ao buscar solicitações', details: error.message });
    }

    console.log('✅ Solicitações encontradas:', data?.length || 0);
    
    // Log de teste para verificar estrutura dos dados
    if (data && data.length > 0) {
      console.log('📋 Exemplo de solicitação:', JSON.stringify(data[0], null, 2));
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('❌ Erro ao buscar solicitações:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro ao buscar solicitações', details: error.message });
  }
});

// POST /api/solicitacoes-carteira - Criar nova solicitação
router.post('/solicitacoes-carteira', authenticateToken, async (req, res) => {
  try {
    console.log('📝 POST /api/solicitacoes-carteira chamado');
    console.log('📝 Dados recebidos:', req.body);
    
    // Apenas clínicas podem criar solicitações
    if (req.user.tipo !== 'clinica') {
      return res.status(403).json({ error: 'Apenas clínicas podem criar solicitações' });
    }

    // Buscar nome real da clínica no banco de dados
    let clinicaNome = req.user.nome || req.user.email;
    
    console.log('🔍 Buscando nome da clínica para ID:', req.user.id);
    console.log('🔍 Nome do usuário:', req.user.nome);
    console.log('🔍 Email do usuário:', req.user.email);
    
    try {
      const { data: clinicaData, error: clinicaError } = await supabaseAdmin
        .from('clinicas')
        .select('nome')
        .eq('id', req.user.id)
        .single();
      
      console.log('🔍 Dados da clínica encontrados:', clinicaData);
      console.log('🔍 Erro na busca:', clinicaError);
      
      if (!clinicaError && clinicaData?.nome) {
        clinicaNome = clinicaData.nome;
        console.log('✅ Nome da clínica atualizado para:', clinicaNome);
      } else {
        console.log('⚠️ Usando nome do usuário:', clinicaNome);
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar nome da clínica:', error.message);
      console.log('⚠️ Usando nome do usuário:', clinicaNome);
    }

    // Preparar dados para inserção
    const insertData = {
      pacientes_carteira: req.body.pacientes_carteira,
      calculos: req.body.calculos,
      percentual_alvo: req.body.percentual_alvo,
      observacoes_clinica: req.body.observacoes_clinica || '',
      clinica_id: req.user.id,
      clinica_nome: clinicaNome,
      status: 'pendente'
    };

    const { data, error } = await supabaseAdmin
      .from('solicitacoes_carteira')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar solicitação:', error);
      console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
      console.error('❌ Dados que tentaram ser inseridos:', JSON.stringify(insertData, null, 2));
      return res.status(500).json({ error: 'Erro ao criar solicitação', details: error.message });
    }

    console.log('✅ Solicitação criada:', data);
    res.json(data);
  } catch (error) {
    console.error('❌ Erro ao criar solicitação:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro ao criar solicitação', details: error.message });
  }
});

// PUT /api/solicitacoes-carteira/:id/status - Atualizar status da solicitação
router.put('/solicitacoes-carteira/:id/status', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 PUT /api/solicitacoes-carteira/:id/status chamado');
    
    // Apenas admin pode aprovar/reprovar
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar/reprovar solicitações' });
    }

    const { id } = req.params;
    const { status, observacoes_admin } = req.body;

    const updateData = {
      status,
      observacoes_admin,
      updated_at: new Date().toISOString()
    };

    // Se aprovando, adicionar dados de aprovação e criar pacientes
    if (status === 'aprovado') {
      updateData.aprovado_por = req.user.id;
      updateData.data_aprovacao = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('solicitacoes_carteira')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }

    console.log('✅ Status atualizado:', data);

    // Se aprovando, verificar tipo de solicitação
    if (status === 'aprovado' && data && data.pacientes_carteira && Array.isArray(data.pacientes_carteira)) {
      // Se for solicitação de antecipação, atualizar fechamentos existentes
      if (data.tipo_solicitacao === 'antecipacao') {
        console.log('🔄 Atualizando antecipação dos fechamentos...');
        
        const fechamentosAtualizados = [];
        const fechamentosErrors = [];

        for (const paciente of data.pacientes_carteira) {
          if (!paciente.fechamento_id) continue;

          try {
            const parcelasAntecipar = Number.isFinite(paciente.numeroParcelasAntecipar)
              ? paciente.numeroParcelasAntecipar
              : 0;

            const { error: updateFechamentoError } = await supabaseAdmin
              .from('fechamentos')
              .update({ antecipacao_meses: parcelasAntecipar })
              .eq('id', paciente.fechamento_id);

            if (updateFechamentoError) {
              console.error(`❌ Erro ao atualizar fechamento ${paciente.fechamento_id}:`, updateFechamentoError);
              fechamentosErrors.push({ paciente: paciente.nomeCompleto || 'Desconhecido', error: updateFechamentoError.message });
            } else {
              console.log(`✅ Antecipação atualizada para paciente ${paciente.nomeCompleto || paciente.paciente_id}`);
              fechamentosAtualizados.push(paciente.nomeCompleto || paciente.paciente_id);
            }
          } catch (error) {
            console.error(`❌ Erro ao atualizar fechamento:`, error);
            fechamentosErrors.push({ paciente: paciente.nomeCompleto || 'Desconhecido', error: error.message });
          }
        }

        console.log(`✅ Atualização concluída: ${fechamentosAtualizados.length} atualizados, ${fechamentosErrors.length} erros`);
        
        return res.json({
          ...data,
          fechamentos_atualizados: fechamentosAtualizados.length,
          fechamentos_erros: fechamentosErrors
        });
      } else {
        // Se for carteira existente normal, criar pacientes automaticamente
        console.log('🔄 Criando pacientes da carteira existente...');
        
        const pacientesCreated = [];
        const pacientesErrors = [];

        for (const paciente of data.pacientes_carteira) {
          try {
            // Normalizar CPF (remover caracteres não numéricos)
            const cpfNumeros = paciente.cpf ? paciente.cpf.replace(/\D/g, '') : null;

            const pacienteData = {
              nome: paciente.nomeCompleto,
              cpf: cpfNumeros,
              telefone: '',
              cidade: '',
              estado: '',
              tipo_tratamento: 'Carteira Existente',
              status: 'fechado',
              observacoes: 'Paciente da carteira existente - Aprovado',
              carteira_existente: true,
              clinica_id: data.clinica_id,
              cadastrado_por_clinica: true,
              valor_parcela: paciente.valorParcela,
              numero_parcelas_aberto: paciente.numeroParcelasAberto,
              primeira_vencimento: paciente.primeiraVencimento,
              numero_parcelas_antecipar: paciente.numeroParcelasAntecipar,
              fator_am: 0.33,
              data_aceite: new Date().toISOString().split('T')[0],
              valor_entregue_total: data.calculos?.valorEntregueTotal || 0,
              desagio_total: data.calculos?.desagioTotal || 0,
              valor_face_total: data.calculos?.valorFaceTotal || 0,
              valor_total_operacao: data.calculos?.valorTotalOperacao || 0,
              valor_colateral: data.calculos?.valorColateral || 0,
              percentual_final: data.calculos?.percentualFinal || 0,
              empresa_id: req.user.empresa_id || null
            };

            const { data: pacienteCriado, error: pacienteError } = await supabaseAdmin
              .from('pacientes')
              .insert([pacienteData])
              .select()
              .single();

            if (pacienteError) {
              console.error(`❌ Erro ao criar paciente ${paciente.nomeCompleto}:`, pacienteError);
              pacientesErrors.push({ paciente: paciente.nomeCompleto, error: pacienteError.message });
            } else {
              console.log(`✅ Paciente criado: ${paciente.nomeCompleto} (ID: ${pacienteCriado.id})`);
              pacientesCreated.push(paciente.nomeCompleto);
            }
          } catch (error) {
            console.error(`❌ Erro ao criar paciente ${paciente.nomeCompleto}:`, error);
            pacientesErrors.push({ paciente: paciente.nomeCompleto, error: error.message });
          }
        }

        console.log(`✅ Criação concluída: ${pacientesCreated.length} criados, ${pacientesErrors.length} erros`);
        
        return res.json({
          ...data,
          pacientes_criados: pacientesCreated.length,
          pacientes_erros: pacientesErrors
        });
      }
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status da solicitação' });
  }
});

// DELETE /api/solicitacoes-carteira/:id - Excluir solicitação
router.delete('/solicitacoes-carteira/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/solicitacoes-carteira/:id chamado');
    
    // Apenas admin pode excluir solicitações
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir solicitações' });
    }

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('solicitacoes_carteira')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao excluir solicitação:', error);
      throw error;
    }

    console.log('✅ Solicitação excluída com sucesso');
    res.json({ message: 'Solicitação excluída com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir solicitação:', error);
    res.status(500).json({ error: 'Erro ao excluir solicitação' });
  }
});

// POST /api/solicitacoes-carteira/antecipacao - Criar solicitação de antecipação para pacientes existentes
router.post('/solicitacoes-carteira/antecipacao', authenticateToken, async (req, res) => {
  try {
    console.log('📝 POST /api/solicitacoes-carteira/antecipacao chamado');
    console.log('📝 Dados recebidos:', req.body);
    
    // Apenas clínicas podem criar solicitações
    if (req.user.tipo !== 'clinica') {
      return res.status(403).json({ error: 'Apenas clínicas podem solicitar antecipação.' });
    }

    const { solicitacoes, observacoes_clinica } = req.body || {};

    if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
      return res.status(400).json({ error: 'Informe ao menos um paciente na solicitação.' });
    }

    // Buscar nome real da clínica no banco de dados
    let clinicaNome = req.user.nome || req.user.email;
    try {
      const { data: clinicaData, error: clinicaError } = await supabaseAdmin
        .from('clinicas')
        .select('nome')
        .eq('id', req.user.id)
        .single();
      if (!clinicaError && clinicaData?.nome) {
        clinicaNome = clinicaData.nome;
      }
    } catch (errorBuscaClinica) {
      console.warn('⚠️ Não foi possível buscar nome da clínica:', errorBuscaClinica.message);
    }

    // Buscar dados completos dos pacientes e fechamentos
    const pacientesCarteira = [];
    for (const solicitacao of solicitacoes) {
      if (!solicitacao?.paciente_id || !solicitacao?.fechamento_id) continue;

      try {
        // Buscar paciente
        const { data: pacienteData, error: pacienteError } = await supabaseAdmin
          .from('pacientes')
          .select('nome, cpf, valor_parcela, numero_parcelas_aberto, primeira_vencimento')
          .eq('id', solicitacao.paciente_id)
          .single();

        // Buscar fechamento
        const { data: fechamentoData, error: fechamentoError } = await supabaseAdmin
          .from('fechamentos')
          .select('valor_fechado, valor_parcela, numero_parcelas')
          .eq('id', solicitacao.fechamento_id)
          .single();

        if (pacienteError || fechamentoError) {
          console.warn(`⚠️ Erro ao buscar dados do paciente ${solicitacao.paciente_id}:`, pacienteError || fechamentoError);
          continue;
        }

        const parcelasSolicitadas = Number.isFinite(solicitacao.parcelas_solicitadas) ? solicitacao.parcelas_solicitadas : 0;
        const parcelasAtual = Number.isFinite(solicitacao.parcelas_atual) ? solicitacao.parcelas_atual : 0;

        // Log para debug
        console.log(`📊 Paciente ${solicitacao.paciente_id}:`, {
          parcelasSolicitadas,
          parcelasAtual,
          numeroParcelasFechamento: fechamentoData.numero_parcelas,
          numeroParcelasPaciente: pacienteData.numero_parcelas_aberto
        });

        pacientesCarteira.push({
          paciente_id: solicitacao.paciente_id,
          fechamento_id: solicitacao.fechamento_id,
          nomeCompleto: pacienteData.nome || solicitacao.paciente_nome || '',
          cpf: pacienteData.cpf || '',
          valorParcela: fechamentoData.valor_parcela || pacienteData.valor_parcela || 0,
          numeroParcelasAberto: fechamentoData.numero_parcelas || pacienteData.numero_parcelas_aberto || 0,
          primeiraVencimento: pacienteData.primeira_vencimento || new Date().toISOString().split('T')[0],
          numeroParcelasAntecipar: parcelasSolicitadas,
          parcelasAtual: parcelasAtual
        });
      } catch (errorBusca) {
        console.error(`❌ Erro ao buscar dados do paciente ${solicitacao.paciente_id}:`, errorBusca);
      }
    }

    if (pacientesCarteira.length === 0) {
      return res.status(400).json({ error: 'Nenhum paciente válido encontrado para a solicitação.' });
    }

    // Calcular valores para o resumo financeiro
    const totalFace = pacientesCarteira.reduce((acc, p) => {
      const valor = Number(p.valorParcela) || 0;
      const parcelas = Number(p.numeroParcelasAntecipar) || 0;
      return acc + valor * parcelas;
    }, 0);

    // Colateral = parcelas restantes após a antecipação
    // parcelas restantes = total de parcelas - parcelas antecipadas
    const totalColateral = pacientesCarteira.reduce((acc, p) => {
      const valor = Number(p.valorParcela) || 0;
      const totalParcelas = Number(p.numeroParcelasAberto) || 0;
      const parcelasAntecipar = Number(p.numeroParcelasAntecipar) || 0;
      const parcelasRestantes = Math.max(0, totalParcelas - parcelasAntecipar);
      
      console.log(`💰 Cálculo Colateral para ${p.nomeCompleto}:`, {
        valorParcela: valor,
        totalParcelas,
        parcelasAntecipar,
        parcelasRestantes,
        valorColateral: valor * parcelasRestantes
      });
      
      return acc + valor * parcelasRestantes;
    }, 0);

    console.log(`📈 Totais calculados:`, {
      totalFace,
      totalColateral,
      percentualFinal: totalFace > 0 ? (totalColateral / totalFace) * 100 : 0
    });

    const percentualFinal = totalFace > 0 ? (totalColateral / totalFace) * 100 : 0;

    // Criar detalhamento de parcelas individuais para cada paciente
    // Parcelas antecipadas = OPERAÇÃO (com deságio)
    // Parcelas restantes = COLATERAL (sem deságio)
    const parcelasDetalhadas = [];
    const fatorAM = 0.33; // Fator de deságio fixo de 0.33% ao dia
    const dataHoje = new Date();
    dataHoje.setHours(0, 0, 0, 0);

    pacientesCarteira.forEach((p) => {
      const valorParcela = Number(p.valorParcela) || 0;
      const totalParcelas = Number(p.numeroParcelasAberto) || 0;
      const parcelasAntecipar = Number(p.numeroParcelasAntecipar) || 0;
      const parcelasRestantes = Math.max(0, totalParcelas - parcelasAntecipar);
      
      // Parse da primeira data de vencimento
      let primeiraVencimento = new Date();
      try {
        if (p.primeiraVencimento) {
          primeiraVencimento = new Date(p.primeiraVencimento);
          primeiraVencimento.setHours(0, 0, 0, 0);
        }
      } catch (e) {
        console.warn('Erro ao parsear primeiraVencimento:', e);
      }

      // Adicionar parcelas de OPERAÇÃO (antecipadas)
      for (let i = 0; i < parcelasAntecipar; i++) {
        const dataVencimento = new Date(primeiraVencimento);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        dataVencimento.setHours(0, 0, 0, 0);
        
        // Calcular dias entre hoje e o vencimento
        const diferencaMs = dataVencimento - dataHoje;
        const dias = Math.max(0, Math.ceil(diferencaMs / (1000 * 60 * 60 * 24)));
        
        // Calcular deságio (0.33% ao dia)
        const desagio = valorParcela * (fatorAM / 100) * dias;
        const liquidez = Math.max(0, valorParcela - desagio);
        
        parcelasDetalhadas.push({
          paciente: p.nomeCompleto || '',
          tipo: 'OPERAÇÃO',
          categoria: 'OP',
          parcela: i + 1,
          valorFace: valorParcela,
          valor: valorParcela,
          desagio: desagio,
          liquidez: liquidez,
          valorEntregue: liquidez,
          vencimento: dataVencimento.toISOString().split('T')[0]
        });
      }

      // Adicionar parcelas de COLATERAL (restantes)
      for (let i = 0; i < parcelasRestantes; i++) {
        const dataVencimento = new Date(primeiraVencimento);
        dataVencimento.setMonth(dataVencimento.getMonth() + parcelasAntecipar + i);
        dataVencimento.setHours(0, 0, 0, 0);
        
        parcelasDetalhadas.push({
          paciente: p.nomeCompleto || '',
          tipo: 'COLATERAL',
          categoria: 'COL',
          parcela: parcelasAntecipar + i + 1,
          valorFace: valorParcela,
          valor: valorParcela,
          desagio: 0,
          liquidez: valorParcela,
          valorEntregue: valorParcela,
          vencimento: dataVencimento.toISOString().split('T')[0]
        });
      }
    });

    // Calcular deságio total apenas das parcelas de OPERAÇÃO
    const desagioTotal = parcelasDetalhadas
      .filter(p => p.tipo === 'OPERAÇÃO')
      .reduce((acc, p) => acc + (p.desagio || 0), 0);
    
    const valorEntregueTotal = totalFace - desagioTotal;

    // Estrutura de cálculos compatível com o formato esperado pelo frontend
    const calculosResumo = {
      parcelasDetalhadas: parcelasDetalhadas,
      valorFaceTotal: totalFace,
      valorEntregueTotal: valorEntregueTotal,
      valorTotalOperacao: totalFace,
      valorOperacaoEntregue: valorEntregueTotal,
      valorColateral: totalColateral,
      valorColateralEntregue: totalColateral,
      desagioTotal: desagioTotal,
      percentualFinal: percentualFinal,
      percentualAlvo: 130,
      slack: 0
    };

    // Preparar dados para inserção na estrutura de solicitacoes_carteira
    const insertData = {
      pacientes_carteira: pacientesCarteira,
      calculos: calculosResumo,
      percentual_alvo: calculosResumo.percentualAlvo,
      observacoes_clinica: observacoes_clinica || 'Solicitação de antecipação para pacientes existentes',
      clinica_id: req.user.id,
      clinica_nome: clinicaNome,
      status: 'pendente',
      tipo_solicitacao: 'antecipacao' // Marcar como tipo antecipação
    };

    const { data, error } = await supabaseAdmin
      .from('solicitacoes_carteira')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar solicitação de antecipação:', error);
      return res.status(500).json({ error: 'Erro ao criar solicitação de antecipação', details: error.message });
    }

    console.log('✅ Solicitação de antecipação criada:', data);
    res.json(data);
  } catch (error) {
    console.error('❌ Erro inesperado ao criar solicitação de antecipação:', error);
    res.status(500).json({ error: 'Erro ao criar solicitação de antecipação', details: error.message });
  }
});

module.exports = router;
