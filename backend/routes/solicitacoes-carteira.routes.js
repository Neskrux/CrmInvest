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

    // Se aprovando, criar pacientes automaticamente
    if (status === 'aprovado' && data && data.pacientes_carteira && Array.isArray(data.pacientes_carteira)) {
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

module.exports = router;
