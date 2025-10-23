const { supabase, supabaseAdmin } = require('../config/database');

// GET /api/empreendimentos/test - Testar conexão e tabela
const testEmpreendimentos = async (req, res) => {
  try {
    console.log('🧪 [Backend] Testando conexão com empreendimentos...');
    
    // Testar se a tabela existe
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ [Backend] Erro ao acessar tabela empreendimentos:', error);
      return res.status(500).json({ 
        error: 'Tabela empreendimentos não existe ou não é acessível',
        details: error.message,
        hint: 'Verifique se a tabela empreendimentos foi criada no banco de dados'
      });
    }

    console.log('✅ [Backend] Tabela empreendimentos acessível');
    res.json({ 
      success: true, 
      message: 'Tabela empreendimentos acessível',
      data: data 
    });
  } catch (error) {
    console.error('❌ [Backend] Erro no teste:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Erro ao testar conexão com empreendimentos'
    });
  }
};

// GET /api/empreendimentos - Listar empreendimentos
const getAllEmpreendimentos = async (req, res) => {
  try {
    // Filtrar empreendimentos por empresa_id se o usuário não for admin
    let query = supabaseAdmin
      .from('empreendimentos')
      .select('*');

    // Se não for admin, filtrar por empresa_id
    if (req.user.tipo !== 'admin') {
      query = query.eq('empresa_id', req.user.empresa_id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('❌ [Backend] Erro completo:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.details || 'Erro interno do servidor'
    });
  }
};

// GET /api/empreendimentos/:id - Buscar empreendimento por ID
const getEmpreendimentoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  testEmpreendimentos,
  getAllEmpreendimentos,
  getEmpreendimentoById
};

