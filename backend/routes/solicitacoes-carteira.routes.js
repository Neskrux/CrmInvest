const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/solicitacoes-carteira - Buscar solicitações
router.get('/solicitacoes-carteira', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/solicitacoes-carteira chamado');
    
    let query = supabaseAdmin
      .from('solicitacoes_carteira')
      .select('*')
      .order('created_at', { ascending: false });

    // Se for clínica, mostrar apenas suas solicitações
    if (req.user.tipo === 'clinica') {
      query = query.eq('clinica_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar solicitações:', error);
      throw error;
    }

    console.log('✅ Solicitações encontradas:', data?.length || 0);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Erro ao buscar solicitações:', error);
    res.status(500).json({ error: 'Erro ao buscar solicitações' });
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

    const { data, error } = await supabaseAdmin
      .from('solicitacoes_carteira')
      .insert([{
        ...req.body,
        clinica_id: req.user.id,
        clinica_nome: clinicaNome,
        status: 'pendente'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar solicitação:', error);
      throw error;
    }

    console.log('✅ Solicitação criada:', data);
    res.json(data);
  } catch (error) {
    console.error('❌ Erro ao criar solicitação:', error);
    res.status(500).json({ error: 'Erro ao criar solicitação' });
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

    // Se aprovando, adicionar dados de aprovação
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
